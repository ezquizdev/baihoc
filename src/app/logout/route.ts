import { type NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/application/infra/auth/session";
import { sanitizeNextPath } from "@/lib/urls";

export async function GET(request: NextRequest) {
  await clearSession();

  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get("next"));

  const loginUrl = new URL("/auth/login", request.url);
  if (next) {
    loginUrl.searchParams.set("next", next);
  }

  return NextResponse.redirect(loginUrl);
}
