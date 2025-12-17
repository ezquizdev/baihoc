import { NextResponse } from "next/server";
import { completeProfile } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId || !body.fullName) {
      return NextResponse.json(
        { error: "userId and fullName required" },
        { status: 400 },
      );
    }
    const user = await completeProfile(body.userId, {
      fullName: body.fullName,
      school: body.school,
      dateOfBirth: body.dateOfBirth,
      avatarUrl: body.avatarUrl,
    });
    return NextResponse.json(
      { userId: user.id, profileCompleted: user.profile_completed },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
