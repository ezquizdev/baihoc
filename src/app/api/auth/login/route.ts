import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerLoginWithEmail } from "@/application/controllers/authController";
import { setSession, toSessionPayload } from "@/application/infra/auth/session";

const loginSchema = z
  .object({
    email: z.string(),
    password: z.string(),
  })
  .passthrough();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Thiếu email hoặc mật khẩu" },
        { status: 400 },
      );
    }
    const { user, sessionUser } = await controllerLoginWithEmail(parsed.data);
    await setSession(toSessionPayload(sessionUser));
    return NextResponse.json(
      {
        userId: user.id,
        role: user.role,
        tier: user.tier,
        profileCompleted: sessionUser.profileCompleted,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
