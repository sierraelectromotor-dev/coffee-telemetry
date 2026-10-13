import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Esquema de validación del payload proveniente del ESP32 A7670
const TelemetryPayloadSchema = z.object({
  machineCode: z.string().min(1, "El código de máquina es obligatorio"),
  button: z.number().int().min(1).max(4, "El botón debe ser un valor entre 1 y 4"),
  timestamp: z.union([z.number(), z.string()]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verificación de seguridad mediante API Key
    const apiKey = req.headers.get("x-api-key");
    const validServerKey = process.env.TELEMETRY_API_KEY;

    if (!apiKey || (validServerKey && apiKey !== validServerKey)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // 2. Parseo y validación de entrada
    const body = await req.json();
    const parseResult = TelemetryPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { machineCode, button, timestamp } = parseResult.data;

    // Normalizar timestamp
    let eventTime = new Date();
    if (typeof timestamp === "number") {
      eventTime = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
    } else if (typeof timestamp === "string") {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) eventTime = parsedDate;
    }

    // 3. Consulta de máquina y slot configurado para el botón
    const machine = await prisma.machine.findUnique({
      where: { code: machineCode },
      include: {
        dispenseSlots: {
          where: { buttonIndex: button, isActive: true },
          include: { flavor: true },
        },
      },
    });

    if (!machine) {
      return NextResponse.json(
        { error: `Máquina '${machineCode}' no registrada` },
        { status: 404 }
      );
    }

    const slot = machine.dispenseSlots[0];
    if (!slot || !slot.flavor) {
      return NextResponse.json(
        { error: `El botón ${button} no tiene un sabor configurado o activo` },
        { status: 422 }
      );
    }

    // 4. Calcular descuento de inventario en la tolva
    const currentStock = Number(slot.currentStockGrams ?? 1000);
    const powderUsed = Number(slot.powderGrammage);
    const newStock = Math.max(0, Number((currentStock - powderUsed).toFixed(2)));

    // 5. Transacción atómica: Registrar evento, descontar tolva y actualizar ping de la máquina
    const [event] = await prisma.$transaction([
      prisma.dispenseEvent.create({
        data: {
          machineId: machine.id,
          buttonIndex: button,
          flavorName: slot.flavor?.name || "Bebida",
          powderUsedGrams: slot.powderGrammage,
          waterUsedMl: slot.waterVolumeMl,
          price: slot.price,
          timestamp: eventTime,
        },
        select: { id: true },
      }),
      prisma.dispenseSlot.update({
        where: { id: slot.id },
        data: {
          currentStockGrams: newStock,
        },
      }),
      prisma.machine.update({
        where: { id: machine.id },
        data: {
          lastPingAt: new Date(),
          status: "ONLINE",
        },
      }),
    ]);

    // 5. Respuesta ultra-compacta para optimizar paquetes celulares 4G
    return NextResponse.json({ status: "ok", id: event.id }, { status: 200 });

  } catch (error) {
    console.error("[TELEMETRY_API_ERROR]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
