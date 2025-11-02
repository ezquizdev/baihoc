import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    await requestPasswordReset(body.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
