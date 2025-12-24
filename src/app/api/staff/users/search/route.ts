import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerAdminSearchByEmail } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { normalizeEmail } from "@/application/utils/email";

const emailSchema = z.string().email();

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const emailParam = url.searchParams.get("email");
  const parsed = emailSchema.safeParse(emailParam ? normalizeEmail(emailParam) : null);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  try {
    const user = await controllerAdminSearchByEmail(parsed.data);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
