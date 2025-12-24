import { NextResponse } from "next/server";
import { controllerGoogleLogin } from "@/application/controllers/authController";
import { setSession, toSessionPayload } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.accessToken) {
      return NextResponse.json(
        { error: "Thiếu access token" },
        { status: 400 },
      );
    }
    const { user, sessionUser } = await controllerGoogleLogin({
      accessToken: body.accessToken,
    });
    await setSession(toSessionPayload(sessionUser));
    return NextResponse.json(
      {
        userId: user.id,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
