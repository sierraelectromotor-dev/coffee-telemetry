import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
}

export const SESSION_COOKIE_NAME = "coffee_telemetry_session";

function getSecret(): string {
  return process.env.SESSION_SECRET || "coffee-telemetry-default-secret-key-change-in-prod-2026";
}

// Genera un hash seguro para contraseñas usando scrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

// Verifica la contraseña contra el hash almacenado
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !password) return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  try {
    const keyBuffer = Buffer.from(hash, "hex");
    return new Promise((resolve) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) {
          resolve(false);
          return;
        }
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      });
    });
  } catch {
    return false;
  }
}

// Firma un token de sesión seguro (Payload en Base64 + HMAC-SHA256)
export function signSession(user: SessionUser): string {
  const payloadObj = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 días de validez
  };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

// Valida la firma del token y la expiración
export function verifySession(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(json);

    if (parsed.exp && Math.floor(Date.now() / 1000) > parsed.exp) {
      return null;
    }

    if (!parsed.id || !parsed.email || !parsed.role) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

// Obtiene el usuario de la sesión actual
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Establece la cookie de sesión HTTP-only
export async function setSessionCookie(user: SessionUser) {
  const cookieStore = cookies();
  const token = signSession(user);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

// Elimina la sesión
export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
