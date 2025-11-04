import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/core/env";

const SESSION_COOKIE = "baihoc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  profileCompleted: boolean;
};

export async function setSession(payload: SessionPayload) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secretKey);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
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
    };
  } catch {
    await clearSession();
    return null;
  }
}
