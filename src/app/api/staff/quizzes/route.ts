import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerCreateQuiz,
  controllerListStaffQuizzes,
} from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const quizPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  subjectId: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  visibility: z.enum(["free", "premium"]),
  isChallenge: z.boolean().optional(),
  estimatedTimeSeconds: z.number().int().positive().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  featuredRank: z.number().int().nullable().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
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
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  try {
    const items = await controllerListStaffQuizzes({
      status: (searchParams.get("status") ?? undefined) as
        | "draft"
        | "published"
        | "archived"
        | undefined,
      search: searchParams.get("search") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
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
