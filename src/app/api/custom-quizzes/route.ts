import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerGenerateCustomQuiz } from "@/application/controllers/customQuizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import type { DifficultyLevel } from "@/application/models/enums";
import { isServiceError } from "@/application/services/errors";

const generateSchema = z.object({
  difficulty: z.number().int().min(1).max(5),
  questionCount: z.number().int().min(1).max(100),
  durationSeconds: z.number().int().positive().nullable().optional(),
  topicsBySubject: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        topicIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
    role: "student",
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = generateSchema.parse(body);
    const result = await controllerGenerateCustomQuiz(auth.sub, {
      difficulty: parsed.difficulty as DifficultyLevel,
      questionCount: parsed.questionCount,
      durationSeconds: parsed.durationSeconds,
      topicsBySubject: parsed.topicsBySubject,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tạo quiz tuỳ chỉnh";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
