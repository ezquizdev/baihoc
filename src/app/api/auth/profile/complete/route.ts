import { NextResponse } from "next/server";
import { controllerCompleteProfile } from "@/application/controllers/authController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { setSession, toSessionPayload } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedApi(request, {
      allowIncompleteProfile: true,
    });
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    if (!body.userId || !body.fullName) {
      return NextResponse.json(
        { error: "Thiếu mã người dùng hoặc họ tên" },
        { status: 400 },
      );
    }
    const { user, sessionUser } = await controllerCompleteProfile(body);
    await setSession(toSessionPayload(sessionUser));
    return NextResponse.json(
      { userId: user.id, profileCompleted: sessionUser.profileCompleted },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
