import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { UserRole, UserTier } from "@/application/models/user";
import { env } from "@/core/env";

if (typeof window !== "undefined") {
  throw new Error("session utilities can only be imported on the server.");
}

const SESSION_COOKIE = "baihoc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);
const isProd = process.env.NODE_ENV === "production";

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  profileCompleted: boolean;
  fullName?: string;
  avatarUrl?: string;
};

export function toSessionPayload(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  profileCompleted: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
}): SessionPayload {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
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
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    const role = String(payload.role);
    if (role !== "student" && role !== "staff") {
      await clearSession();
      return null;
    }
    const tier = payload.tier ? String(payload.tier) : "free";
    const normalizedTier = tier === "paid" ? "paid" : "free";
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role,
      tier: normalizedTier,
      profileCompleted: Boolean(payload.profileCompleted),
      fullName: payload.fullName ? String(payload.fullName) : undefined,
      avatarUrl: payload.avatarUrl ? String(payload.avatarUrl) : undefined,
    };
  } catch {
    await clearSession();
    return null;
  }
}
