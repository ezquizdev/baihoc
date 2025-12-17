import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.token || !body.newPassword) {
      return NextResponse.json(
        { error: "Thiếu mã đặt lại hoặc mật khẩu mới" },
        { status: 400 },
      );
    }
    await resetPasswordWithToken(body.token, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
