import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.token || !body.newPassword) {
      return NextResponse.json(
        { error: "token and newPassword required" },
        { status: 400 },
      );
    }
    await resetPasswordWithToken(body.token, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
