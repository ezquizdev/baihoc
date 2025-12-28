import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { findUserById } from "@/application/infra/db/userRepo";

import {
  clearSession,
  getSession,
  type SessionPayload,
  setSession,
  toSessionPayload,
} from "./session";

type ApiGuardResult = SessionPayload | NextResponse;
type UserRole = "student" | "staff";

type PageAuthOptions = {
  role?: UserRole;
  allowIncompleteProfile?: boolean;
  next?: string;
};

type ApiAuthOptions = {
  role?: UserRole;
  allowIncompleteProfile?: boolean;
};

function unauthorizedJson(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

function loginRedirectUrl(next?: string) {
  if (!next) return "/auth/login";
  const qs = new URLSearchParams({ next }).toString();
  return `/auth/login?${qs}`;
}

function logoutRedirectUrl(next?: string) {
  if (!next) return "/logout";
  const qs = new URLSearchParams({ next }).toString();
  return `/logout?${qs}`;
}

/**
 * Page/server-component guard: ensures a signed-in user and optional role.
 * Redirects to login (with ?next) or profile completion; non-staff users go to dashboard.
 */
export async function requireAuthenticatedPage(
  options: PageAuthOptions = {},
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(loginRedirectUrl(options.next) as Parameters<typeof redirect>[0]);
  }
  const freshSession = await refreshSessionFromDb(session);
  if (!freshSession) {
    redirect(logoutRedirectUrl(options.next) as Parameters<typeof redirect>[0]);
  }
  if (!options.allowIncompleteProfile && !freshSession.profileCompleted) {
    redirect("/auth/profile-complete");
  }
  if (options.role && freshSession.role !== options.role) {
    redirect("/dashboard");
  }
  return freshSession;
}

/**
 * API/route guard: ensures a signed-in user and optional role.
 * Returns JSON 401/403 on failure (no redirects for APIs).
 */
export async function requireAuthenticatedApi(
  _req: Request,
  options: ApiAuthOptions = {},
): Promise<ApiGuardResult> {
  const session = await getSession();
  if (!session) {
    return unauthorizedJson("unauthorized", 401);
  }
  const freshSession = await refreshSessionFromDb(session);
  if (!freshSession) {
    return unauthorizedJson("unauthorized", 401);
  }
  if (!options.allowIncompleteProfile && !freshSession.profileCompleted) {
    return unauthorizedJson("profile_incomplete", 403);
  }
  if (options.role && freshSession.role !== options.role) {
    return unauthorizedJson("forbidden", 403);
  }
  return freshSession;
}

async function refreshSessionFromDb(
  session: SessionPayload,
): Promise<SessionPayload | null> {
  const user = await findUserById(session.sub);
  if (!user || user.status !== "active") {
    await safeClearSession();
    return null;
  }
  const fresh = toSessionPayload({
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    profileCompleted: user.profile_completed,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
  });
  if (
    fresh.email !== session.email ||
    fresh.role !== session.role ||
    fresh.tier !== session.tier ||
    fresh.profileCompleted !== session.profileCompleted ||
    fresh.fullName !== session.fullName ||
    fresh.avatarUrl !== session.avatarUrl
  ) {
    await safeSetSession(fresh);
  }
  return fresh;
}

async function safeClearSession() {
  try {
    await clearSession();
  } catch {
    // `cookies()` isn't available in some contexts (e.g. unit tests).
  }
}

async function safeSetSession(payload: SessionPayload) {
  try {
    await setSession(payload);
  } catch {
    // `cookies()` isn't available in some contexts (e.g. unit tests).
  }
}
