import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseInitialized } from "@/lib/init-db";

const CreateFlavorSchema = z.object({
  name: z.string().min(2, "El nombre de la bebida es obligatorio"),
  category: z.enum(["CAFE", "CHOCOLATE", "ESPECIALIDAD", "TE"]),
  description: z.string().optional(),
  price: z.number().min(0, "El precio sugerido debe ser positivo"),
  costPerServing: z.number().min(0, "El costo por servicio debe ser positivo"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureDatabaseInitialized();

    const flavors = await prisma.flavor.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(flavors);
  } catch (error) {
    console.error("[GET_FLAVORS_ERROR]", error);
    return NextResponse.json({ error: "Error al obtener las bebidas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureDatabaseInitialized();

    const body = await req.json();
    const result = CreateFlavorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const newFlavor = await prisma.flavor.create({
      data: result.data,
    });

    return NextResponse.json(newFlavor, { status: 201 });
  } catch (error) {
    console.error("[CREATE_FLAVOR_ERROR]", error);
    return NextResponse.json({ error: "Error al crear la bebida" }, { status: 500 });
  }
}
