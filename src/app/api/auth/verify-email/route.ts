import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/application/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.token) {
      return NextResponse.json({ error: "Thiếu mã xác minh" }, { status: 400 });
    }
    const userId = await verifyEmailWithToken(body.token);
    return NextResponse.json({ userId, verified: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
