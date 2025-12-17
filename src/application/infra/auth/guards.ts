import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { getSession, type SessionPayload } from "./session";

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

/**
 * Page/server-component guard: ensures a signed-in user and optional role.
 * Redirects to login (with ?next) or profile completion; non-staff users go to dashboard.
 */
export async function requireAuthenticatedPage(
  options: PageAuthOptions = {},
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(loginRedirectUrl(options.next));
  }
  if (!options.allowIncompleteProfile && !session.profileCompleted) {
    redirect("/auth/profile-complete");
  }
  if (options.role && session.role !== options.role) {
    redirect("/dashboard");
  }
  return session;
}

/**
 * API/route guard: ensures a signed-in user and optional role.
 * Returns JSON 401/403 on failure (no redirects for APIs).
 */
export async function requireAuthenticatedApi(
  _req: NextRequest,
  options: ApiAuthOptions = {},
): Promise<ApiGuardResult> {
  const session = await getSession();
  if (!session) {
    return unauthorizedJson("unauthorized", 401);
  }
  if (!options.allowIncompleteProfile && !session.profileCompleted) {
    return unauthorizedJson("profile_incomplete", 403);
  }
  if (options.role && session.role !== options.role) {
    return unauthorizedJson("forbidden", 403);
  }
  return session;
}
