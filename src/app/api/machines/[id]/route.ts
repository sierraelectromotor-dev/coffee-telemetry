import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    await prisma.machine.delete({
      where: { id },
    });

    return NextResponse.json({ status: "ok", message: "Máquina eliminada correctamente" });
  } catch (error) {
    console.error("[DELETE_MACHINE_ERROR]", error);
    return NextResponse.json({ error: "Error al eliminar la máquina" }, { status: 500 });
  }
}
