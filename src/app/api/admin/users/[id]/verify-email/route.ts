import { NextResponse } from "next/server";
import { controllerAdminVerifyEmail } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  if (!params?.id) {
    return NextResponse.json({ error: "Thiếu mã người dùng" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;
    const user = await controllerAdminVerifyEmail({
      userId: params.id,
      actorUserId: session.sub,
      reason,
    });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
