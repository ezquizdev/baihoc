import { NextResponse } from "next/server";
import { completeProfile } from "@/application/services/authService";
import { setSession } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId || !body.fullName) {
      return NextResponse.json(
        { error: "Thiếu mã người dùng hoặc họ tên" },
        { status: 400 },
      );
    }
    const user = await completeProfile(body.userId, {
      fullName: body.fullName,
      school: body.school,
      dateOfBirth: body.dateOfBirth,
      avatarUrl: body.avatarUrl,
    });
    await setSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      profileCompleted: user.profile_completed,
    });
    return NextResponse.json(
      { userId: user.id, profileCompleted: user.profile_completed },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
