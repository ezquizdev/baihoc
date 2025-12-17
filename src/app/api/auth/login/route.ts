import { NextResponse } from "next/server";
import { loginWithEmail } from "@/application/services/authService";
import { setSession } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginWithEmail({
      email: body.email,
      password: body.password,
    });
    await setSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      profileCompleted: user.profile_completed,
    });
    return NextResponse.json(
      {
        userId: user.id,
        role: user.role,
        tier: user.tier,
        profileCompleted: user.profile_completed,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
