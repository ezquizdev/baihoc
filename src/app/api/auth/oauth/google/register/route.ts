import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerGoogleRegister } from "@/application/controllers/authController";
import { setSession, toSessionPayload } from "@/application/infra/auth/session";

const googleSchema = z
  .object({
    accessToken: z.string().min(1),
  })
  .passthrough();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = googleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Thiếu access token" },
        { status: 400 },
      );
    }
    const { user, sessionUser } = await controllerGoogleRegister({
      accessToken: parsed.data.accessToken,
    });
    await setSession(toSessionPayload(sessionUser));
    return NextResponse.json(
      {
        userId: user.id,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
