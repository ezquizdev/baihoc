import { type NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/application/infra/auth/session";

function sanitizeNext(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function GET(request: NextRequest) {
  await clearSession();

  const url = new URL(request.url);
  const next = sanitizeNext(url.searchParams.get("next"));

  const loginUrl = new URL("/auth/login", request.url);
  if (next) {
    loginUrl.searchParams.set("next", next);
  }

  return NextResponse.redirect(loginUrl);
}
