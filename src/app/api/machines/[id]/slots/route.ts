import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SlotConfigSchema = z.object({
  buttonIndex: z.number().int().min(1).max(4),
  flavorId: z.string().min(1, "El sabor es obligatorio"),
  powderGrammage: z.number().min(0.5).max(100),
  waterVolumeMl: z.number().min(10).max(500),
  price: z.number().min(0),
  hopperCapacityGrams: z.number().min(100).max(10000).optional().default(1000),
  currentStockGrams: z.number().min(0).max(10000).optional().default(1000),
  lastRefillAt: z.string().optional().nullable(),
  isActive: z.boolean(),
});

const UpdateSlotsSchema = z.array(SlotConfigSchema);

// PUT: Guardar calibración completa de los 4 slots
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: machineId } = params;
    const body = await req.json();

    const parseResult = UpdateSlotsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Configuración inválida", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const slots = parseResult.data;

    // Actualizar o crear cada slot dentro de una transacción atómica
    const updates = slots.map((slot) =>
      prisma.dispenseSlot.upsert({
        where: {
          machineId_buttonIndex: {
            machineId,
            buttonIndex: slot.buttonIndex,
          },
        },
        update: {
          flavorId: slot.flavorId,
          powderGrammage: slot.powderGrammage,
          waterVolumeMl: slot.waterVolumeMl,
          price: slot.price,
          hopperCapacityGrams: slot.hopperCapacityGrams,
          currentStockGrams: slot.currentStockGrams,
          lastRefillAt: slot.lastRefillAt ? new Date(slot.lastRefillAt) : undefined,
          isActive: slot.isActive,
        },
        create: {
          machineId,
          buttonIndex: slot.buttonIndex,
          flavorId: slot.flavorId,
          powderGrammage: slot.powderGrammage,
          waterVolumeMl: slot.waterVolumeMl,
          price: slot.price,
          hopperCapacityGrams: slot.hopperCapacityGrams,
          currentStockGrams: slot.currentStockGrams,
          lastRefillAt: slot.lastRefillAt ? new Date(slot.lastRefillAt) : new Date(),
          isActive: slot.isActive,
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ status: "ok", message: "Calibración guardada exitosamente" });
  } catch (error) {
    console.error("[UPDATE_SLOTS_ERROR]", error);
    return NextResponse.json({ error: "Error al actualizar la calibración" }, { status: 500 });
  }
}

// POST: Acción rápida para "Marcar Full" (rellenar tolva al 100%)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: machineId } = params;
    const body = await req.json();
    const { buttonIndex } = body; // 1, 2, 3, 4, o null para todas

    if (buttonIndex) {
      // Rellenar una tolva específica
      const slot = await prisma.dispenseSlot.findUnique({
        where: {
          machineId_buttonIndex: {
            machineId,
            buttonIndex: Number(buttonIndex),
          },
        },
      });

      if (!slot) {
        return NextResponse.json({ error: "Tolva no encontrada" }, { status: 404 });
      }

      await prisma.dispenseSlot.update({
        where: { id: slot.id },
        data: {
          currentStockGrams: slot.hopperCapacityGrams,
          lastRefillAt: new Date(),
        },
      });

      return NextResponse.json({
        status: "ok",
        message: `Tolva P${buttonIndex} marcada como Full (${slot.hopperCapacityGrams}g)`,
      });
    } else {
      // Rellenar todas las tolvas de la máquina
      const slots = await prisma.dispenseSlot.findMany({
        where: { machineId },
      });

      await prisma.$transaction(
        slots.map((s) =>
          prisma.dispenseSlot.update({
            where: { id: s.id },
            data: {
              currentStockGrams: s.hopperCapacityGrams,
              lastRefillAt: new Date(),
            },
          })
        )
      );

      return NextResponse.json({
        status: "ok",
        message: "Todas las tolvas han sido marcadas al 100% (Full)",
      });
    }
  } catch (error) {
    console.error("[REFILL_SLOTS_ERROR]", error);
    return NextResponse.json({ error: "Error al rellenar tolvas" }, { status: 500 });
  }
}
