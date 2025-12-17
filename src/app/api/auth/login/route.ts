import { NextResponse } from "next/server";
import { loginWithEmail } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginWithEmail({
      email: body.email,
      password: body.password,
    });
    return NextResponse.json(
      { userId: user.id, role: user.role, tier: user.tier },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
