import { NextResponse } from "next/server";
import { controllerAdminUserHistory } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  if (!params?.id) {
    return NextResponse.json({ error: "Thiếu mã người dùng" }, { status: 400 });
  }

  try {
    const history = await controllerAdminUserHistory(params.id);
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
