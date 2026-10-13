import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "coffee_telemetry_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/telemetry") || // La API del ESP32 se autentica con x-api-key
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico";

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Si intenta acceder a una ruta protegida sin sesión
  if (!sessionToken && !isPublicRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya tiene sesión e intenta entrar a /login, redirigir al dashboard
  if (sessionToken && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirección de raíz al dashboard si está autenticado, o al login si no
  if (pathname === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
