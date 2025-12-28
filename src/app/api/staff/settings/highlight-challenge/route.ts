import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerGetStaffHighlightChallengeSettings,
  controllerSetStaffHighlightChallengeSettings,
} from "@/application/controllers/staffSettingsController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const updateSchema = z
  .object({
    quizId: z.string().uuid().nullable(),
    questionId: z.string().uuid().nullable(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const settings = await controllerGetStaffHighlightChallengeSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải cấu hình";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const result = await controllerSetStaffHighlightChallengeSettings({
      staffUserId: auth.sub,
      quizId: parsed.quizId,
      questionId: parsed.questionId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật cấu hình";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
