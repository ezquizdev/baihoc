import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerDeleteQuiz,
  controllerGetStaffQuizDetail,
  controllerUpdateQuiz,
} from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  subjectId: z.string().uuid().optional(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
  visibility: z.enum(["free", "premium"]).optional(),
  isChallenge: z.boolean().optional(),
  estimatedTimeSeconds: z.number().int().positive().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  featuredRank: z.number().int().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  challenge: z
    .union([
      z
        .object({
          startAt: z.string(),
          endAt: z.string(),
          timeLimitSeconds: z.number().int().positive(),
          rules: z.any().optional(),
        })
        .strict(),
      z.null(),
    ])
    .optional(),
});

type Params = { quizId: string };

export async function GET(request: NextRequest, context: { params: Params }) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const quiz = await controllerGetStaffQuizDetail(context.params.quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải quiz";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Params }) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const quiz = await controllerUpdateQuiz(context.params.quizId, parsed);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Params },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await controllerDeleteQuiz(context.params.quizId);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xóa quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
