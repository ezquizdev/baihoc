import { NextResponse } from "next/server";
import { z } from "zod";
import { controllerCompleteProfile } from "@/application/controllers/authController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { setSession, toSessionPayload } from "@/application/infra/auth/session";

const profileSchema = z
  .object({
    fullName: z.string().min(1),
    school: z.string().nullable().optional(),
    dateOfBirth: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  });

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedApi(request, {
      allowIncompleteProfile: true,
    });
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Thiếu họ tên" }, { status: 400 });
    }
    const { user, sessionUser } = await controllerCompleteProfile({
      userId: session.sub,
      fullName: parsed.data.fullName,
      school: parsed.data.school ?? null,
      dateOfBirth: parsed.data.dateOfBirth ?? null,
      avatarUrl: parsed.data.avatarUrl ?? null,
    });
    await setSession(toSessionPayload(sessionUser));
    return NextResponse.json(
      { userId: user.id, profileCompleted: sessionUser.profileCompleted },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
