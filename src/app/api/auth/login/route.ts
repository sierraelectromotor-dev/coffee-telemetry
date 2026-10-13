import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, hashPassword } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos de acceso inválidos", details: result.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Si la base de datos está recién inicializada y no hay usuarios, creamos el admin por defecto
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0 && email.toLowerCase() === "admin@vendingcoffee.com") {
      const defaultHash = await hashPassword("admin1234");
      user = await prisma.user.create({
        data: {
          name: "Administrador IoT",
          email: "admin@vendingcoffee.com",
          passwordHash: defaultHash,
          role: "ADMIN",
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Configurar cookie de sesión HTTP-only
    await setSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Error en el servidor al autenticar" },
      { status: 500 }
    );
  }
}
