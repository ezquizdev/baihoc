import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  parseDifficulty,
  parsePagination,
  parseQuestionStatus,
} from "@/app/api/_utils/query";
import {
  controllerCreateQuestion,
  controllerListQuestions,
} from "@/application/controllers/questionController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  type DifficultyLevel,
  QuestionTypeValues,
} from "@/application/models/enums";

const createSchema = z.object({
  subjectId: z.string().uuid(),
  defaultDifficulty: z.number().int().min(1).max(5),
  type: z.enum(QuestionTypeValues),
  stem: z.string().min(1),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  defaultScore: z.number().positive().optional(),
  options: z
    .array(
      z.object({
        label: z.string().nullable().optional(),
        text: z.string().min(1),
        isCorrect: z.boolean(),
        position: z.number().int().positive(),
      }),
    )
    .optional(),
  shortAnswers: z
    .array(
      z.object({
        acceptableAnswer: z.string().min(1),
        caseSensitive: z.boolean().optional(),
      }),
    )
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

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    limit: 20,
    offset: 0,
  });
  try {
    const items = await controllerListQuestions({
      subjectId: searchParams.get("subjectId") ?? undefined,
      difficulty: parseDifficulty(searchParams) as DifficultyLevel | undefined,
      status: parseQuestionStatus(searchParams),
      search: searchParams.get("search") ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const question = await controllerCreateQuestion({
      ...parsed,
      defaultDifficulty: parsed.defaultDifficulty as DifficultyLevel,
      createdBy: auth.sub,
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tạo câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
