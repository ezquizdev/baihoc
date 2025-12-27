import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerResetPassword } from "@/application/controllers/authController";

const confirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Thiếu mã đặt lại hoặc mật khẩu mới" },
        { status: 400 },
      );
    }
    await controllerResetPassword(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
