import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerVerifyEmail } from "@/application/controllers/authController";

const verifySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Thiếu mã xác minh" }, { status: 400 });
    }
    const userId = await controllerVerifyEmail(parsed.data.token);
    return NextResponse.json({ userId, verified: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
