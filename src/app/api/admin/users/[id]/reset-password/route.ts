import { NextResponse } from "next/server";
import { controllerAdminTriggerPasswordReset } from "@/application/controllers/userAdminController";
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
    await controllerAdminTriggerPasswordReset({
      userId: params.id,
      actorUserId: session.sub,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
