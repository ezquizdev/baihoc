import { NextResponse } from "next/server";
import { controllerRegisterWithEmail } from "@/application/controllers/authController";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user } = await controllerRegisterWithEmail(body);
    return NextResponse.json(
      { userId: user.id, status: "pending_verification" },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
