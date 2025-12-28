import { type NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/application/infra/auth/session";
import { getPublicOrigin, sanitizeNextPath } from "@/lib/urls";

export async function GET(request: NextRequest) {
  await clearSession();

  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get("next"));

  const origin = getPublicOrigin(request.headers, url.origin);
  const loginUrl = new URL("/auth/login", origin);
  if (next) loginUrl.searchParams.set("next", next);

  return NextResponse.redirect(loginUrl);
}
