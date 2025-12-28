import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerSubmitStudentDashboardHighlightChallengeAnswer } from "@/application/controllers/studentDashboardController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const submitSchema = z
  .object({
    selectedOptionIds: z.array(z.string().uuid()).min(1).max(24),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "student" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = submitSchema.parse(body);
    const result =
      await controllerSubmitStudentDashboardHighlightChallengeAnswer(auth.sub, {
        selectedOptionIds: parsed.selectedOptionIds,
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
      error instanceof Error ? error.message : "Không thể nộp câu trả lời";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
