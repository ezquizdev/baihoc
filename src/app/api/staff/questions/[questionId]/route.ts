import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerDeleteQuestion,
  controllerGetQuestionDetail,
  controllerUpdateQuestion,
} from "@/application/controllers/questionController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  QuestionStatusValues,
  QuestionTypeValues,
} from "@/application/models/enums";

const updateSchema = z.object({
  subjectId: z.string().uuid().optional(),
  defaultDifficulty: z.number().int().min(1).max(5).optional(),
  type: z.enum(QuestionTypeValues).optional(),
  stem: z.string().min(1).optional(),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  defaultScore: z.number().positive().optional(),
  status: z.enum(QuestionStatusValues).optional(),
  options: z
    .array(
      z.object({
        label: z.string().nullable().optional(),
        text: z.string().min(1),
        isCorrect: z.boolean(),
        position: z.number().int().positive(),
      }),
    )
    .nullable()
    .optional(),
  shortAnswers: z
    .array(
      z.object({
        acceptableAnswer: z.string().min(1),
        caseSensitive: z.boolean().optional(),
      }),
    )
    .nullable()
    .optional(),
  passage: z
    .object({
      content: z.string().min(1),
      mediaUrls: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  passageId: z.string().uuid().nullable().optional(),
  passagePosition: z.number().int().positive().optional(),
});

type Params = { questionId: string };

export async function GET(request: NextRequest, context: { params: Params }) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const question = await controllerGetQuestionDetail(
      context.params.questionId,
    );
    return NextResponse.json({ question });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không tìm thấy câu hỏi";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Params }) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const question = await controllerUpdateQuestion(
      context.params.questionId,
      parsed,
    );
    return NextResponse.json({ question });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật câu hỏi";
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
    const result = await controllerDeleteQuestion(context.params.questionId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xóa/lưu trữ câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
