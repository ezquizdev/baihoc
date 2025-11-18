import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerSetQuizQuestions } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const payloadSchema = z.object({
  questions: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        position: z.number().int().positive().optional(),
        score: z.number().nullable().optional(),
        required: z.boolean().optional(),
      }),
    )
    .default([]),
});

type Params = { quizId: string };

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = payloadSchema.parse(body);
    const { quizId } = await context.params;
    await controllerSetQuizQuestions(quizId, parsed.questions);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật danh sách câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
