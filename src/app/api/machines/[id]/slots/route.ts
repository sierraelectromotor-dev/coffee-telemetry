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
  isActive: z.boolean(),
});

const UpdateSlotsSchema = z.array(SlotConfigSchema);

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
          isActive: slot.isActive,
        },
        create: {
          machineId,
          buttonIndex: slot.buttonIndex,
          flavorId: slot.flavorId,
          powderGrammage: slot.powderGrammage,
          waterVolumeMl: slot.waterVolumeMl,
          price: slot.price,
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
