import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerDeleteQuiz,
  controllerGetStaffQuizDetail,
  controllerUpdateQuiz,
} from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  type DifficultyLevel,
  QuizStatusValues,
  QuizVisibilityValues,
} from "@/application/models/enums";
import { isServiceError } from "@/application/services/errors";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  visibility: z.enum(QuizVisibilityValues).optional(),
  isChallenge: z.boolean().optional(),
  estimatedTimeSeconds: z.number().int().positive().nullable().optional(),
  featuredRank: z.number().int().nullable().optional(),
  status: z.enum(QuizStatusValues).optional(),
  challenge: z
    .union([
      z
        .object({
          startAt: z.string().datetime(),
          endAt: z.string().datetime(),
        })
        .strict(),
      z.null(),
    ])
    .optional(),
});

type Params = { quizId: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const { quizId } = await context.params;
    const quiz = await controllerGetStaffQuizDetail(quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải quiz";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const { quizId } = await context.params;
    const quiz = await controllerUpdateQuiz(quizId, {
      ...parsed,
      difficulty: parsed.difficulty as DifficultyLevel | undefined,
    });
    return NextResponse.json({ quiz });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const { quizId } = await context.params;
    const result = await controllerDeleteQuiz(quizId);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể xóa quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
