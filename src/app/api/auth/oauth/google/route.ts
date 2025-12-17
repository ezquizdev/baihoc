import { NextResponse } from "next/server";
import { upsertGoogleUser } from "@/application/services/authService";

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
    });
    return NextResponse.json(
      {
        userId: user.id,
        role: user.role,
        profileCompleted: user.profile_completed,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
