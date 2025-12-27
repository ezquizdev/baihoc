import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerRequestPasswordReset } from "@/application/controllers/authController";

const requestSchema = z.object({
  email: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Thiếu email" }, { status: 400 });
    }
    await controllerRequestPasswordReset(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
