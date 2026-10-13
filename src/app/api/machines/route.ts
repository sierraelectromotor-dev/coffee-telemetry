import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseInitialized } from "@/lib/init-db";

const CreateMachineSchema = z.object({
  code: z.string().min(2, "El serial o código debe tener al menos 2 caracteres").toUpperCase(),
  name: z.string().min(2, "El nombre de la máquina es obligatorio"),
  location: z.string().min(2, "La ubicación es obligatoria"),
});

// GET /api/machines - Listar todas las máquinas con sus slots y bebidas
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureDatabaseInitialized();

    const machines = await prisma.machine.findMany({
      orderBy: { code: "asc" },
      include: {
        dispenseSlots: {
          orderBy: { buttonIndex: "asc" },
          include: { flavor: true },
        },
      },
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error("[GET_MACHINES_ERROR]", error);
    return NextResponse.json({ error: "Error al obtener las máquinas" }, { status: 500 });
  }
}

// POST /api/machines - Crear una nueva máquina con sus 4 slots automáticos
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureDatabaseInitialized();

    const body = await req.json();
    const result = CreateMachineSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { code, name, location } = result.data;

    // Verificar si el serial ya existe
    const existing = await prisma.machine.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una máquina con el serial ${code}` },
        { status: 409 }
      );
    }

    // Obtener sabores existentes para asociarlos a los 4 botones
    let flavors = await prisma.flavor.findMany({ take: 4 });
    if (flavors.length === 0) {
      const fDefault = await prisma.flavor.create({
        data: { name: "Café Americano", category: "CAFE", price: 2500, costPerServing: 400 },
      });
      flavors = [fDefault];
    }

    // Crear máquina y los 4 botones físicos (1-4)
    const newMachine = await prisma.machine.create({
      data: {
        code,
        name,
        location,
        status: "ONLINE",
        dispenseSlots: {
          create: [1, 2, 3, 4].map((index) => {
            const assignedFlavor = flavors[(index - 1) % flavors.length];
            return {
              buttonIndex: index,
              flavorId: assignedFlavor.id,
              powderGrammage: 18.0,
              waterVolumeMl: 150.0,
              price: Number(assignedFlavor.price) || 2500,
              isActive: true,
            };
          }),
        },
      },
      include: {
        dispenseSlots: {
          include: { flavor: true },
        },
      },
    });

    return NextResponse.json(newMachine, { status: 201 });
  } catch (error) {
    console.error("[CREATE_MACHINE_ERROR]", error);
    return NextResponse.json({ error: "Error al crear la máquina" }, { status: 500 });
  }
}
