import { NextResponse } from "next/server";
import { registerWithEmail } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await registerWithEmail({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      school: body.school,
      dateOfBirth: body.dateOfBirth,
      avatarUrl: body.avatarUrl,
    });
    return NextResponse.json(
      { userId: user.id, status: "pending_verification" },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
