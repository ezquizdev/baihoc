import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "@/core/env";

const SESSION_COOKIE = "baihoc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);
const isProd = process.env.NODE_ENV === "production";

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  profileCompleted: boolean;
  fullName?: string;
  avatarUrl?: string;
};

export function toSessionPayload(user: {
  id: string;
  email: string;
  role: string;
  profileCompleted: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
}): SessionPayload {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    profileCompleted: user.profileCompleted,
    fullName: user.fullName ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export async function setSession(payload: SessionPayload) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secretKey);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, secure: isProd });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: String(payload.role),
      profileCompleted: Boolean(payload.profileCompleted),
      fullName: payload.fullName ? String(payload.fullName) : undefined,
      avatarUrl: payload.avatarUrl ? String(payload.avatarUrl) : undefined,
    };
  } catch {
    await clearSession();
    return null;
  }
}
