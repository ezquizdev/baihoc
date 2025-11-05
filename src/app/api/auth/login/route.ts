import { NextResponse } from "next/server";
import { controllerLoginWithEmail } from "@/application/controllers/authController";
import { setSession } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, sessionUser } = await controllerLoginWithEmail(body);
    await setSession({
      sub: sessionUser.id,
      email: sessionUser.email,
      role: sessionUser.role,
      profileCompleted: sessionUser.profileCompleted,
    });
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
