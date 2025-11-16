import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parsePagination, parseQuizStatus } from "@/app/api/_utils/query";
import {
  controllerCreateQuiz,
  controllerListStaffQuizzes,
} from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { QuizVisibilityValues } from "@/application/models/enums";

const quizPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  difficulty: z.number().int().min(1).max(5),
  visibility: z.enum(QuizVisibilityValues),
  isChallenge: z.boolean().optional(),
  estimatedTimeSeconds: z.number().int().positive().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  featuredRank: z.number().int().nullable().optional(),
  challenge: z
    .object({
      startAt: z.string(),
      endAt: z.string(),
      timeLimitSeconds: z.number().int().positive(),
      rules: z.any().optional(),
    })
    .optional(),
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
    const items = await controllerListStaffQuizzes({
      status: parseQuizStatus(searchParams),
      search: searchParams.get("search") ?? undefined,
      limit,
      offset,
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = quizPayloadSchema.parse(body);
    const quiz = await controllerCreateQuiz({
      ...parsed,
      createdBy: auth.sub,
    });
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tạo quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
