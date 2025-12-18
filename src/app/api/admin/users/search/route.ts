import { NextResponse } from "next/server";
import { controllerAdminSearchByEmail } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(request: Request) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const emailParam = url.searchParams.get("email");
  if (!emailParam) {
    return NextResponse.json({ error: "Thiếu email" }, { status: 400 });
  }

  try {
    const user = await controllerAdminSearchByEmail(normalizeEmail(emailParam));
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
