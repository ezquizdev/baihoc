import { type NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/application/infra/auth/session";
import { sanitizeNextPath } from "@/lib/urls";

export async function GET(request: NextRequest) {
  await clearSession();

  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get("next"));

  const params = new URLSearchParams();
  if (next) params.set("next", next);

  const location = params.size ? `/auth/login?${params.toString()}` : "/auth/login";
  return NextResponse.redirect(location);
}
