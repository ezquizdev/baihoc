import { NextResponse } from "next/server";
import { upsertGoogleUser } from "@/application/services/authService";
import { setSession } from "@/application/infra/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.sub || !body.email) {
      return NextResponse.json(
        { error: "sub and email required" },
        { status: 400 },
      );
    }
    const user = await upsertGoogleUser({
      sub: body.sub,
      email: body.email,
      fullName: body.fullName,
      avatarUrl: body.avatarUrl,
      school: body.school,
      dateOfBirth: body.dateOfBirth,
      profileCompleted: body.profileCompleted,
      allowCreate: Boolean(body.allowCreate),
    });
    const responseBody = {
      userId: user.id,
      role: user.role,
      profileCompleted: user.profile_completed,
    };
    // Only set session if profile is complete; otherwise let client finish profile
    if (user.profile_completed) {
      await setSession({
        sub: user.id,
        email: user.email,
        role: user.role,
        profileCompleted: user.profile_completed,
      });
    }
    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
