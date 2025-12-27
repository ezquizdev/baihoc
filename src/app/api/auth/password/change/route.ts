import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerChangePassword } from "@/application/controllers/authController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const changeSchema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(1),
    newPasswordConfirm: z.string().min(1).optional(),
  });

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedApi(request, {
      allowIncompleteProfile: true,
    });
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const parsed = changeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Thiếu mật khẩu mới" },
        { status: 400 },
      );
    }

    await controllerChangePassword({
      userId: session.sub,
      currentPassword: parsed.data.currentPassword ?? null,
      newPassword: parsed.data.newPassword,
      newPasswordConfirm: parsed.data.newPasswordConfirm,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
