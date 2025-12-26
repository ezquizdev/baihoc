import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerRegisterWithEmail } from "@/application/controllers/authController";

const registerSchema = z
  .object({
    email: z.string(),
    password: z.string(),
    passwordConfirm: z.string().optional(),
    fullName: z.string(),
    school: z.string().nullable().optional(),
    dateOfBirth: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  })
  .passthrough();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu đăng ký không hợp lệ" },
        { status: 400 },
      );
    }
    const { user } = await controllerRegisterWithEmail(parsed.data);
    return NextResponse.json(
      { userId: user.id, status: user.status },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
