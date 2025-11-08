import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerCreateQuestion,
  controllerListQuestions,
} from "@/application/controllers/questionController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const createSchema = z.object({
  subjectId: z.string().uuid(),
  defaultDifficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  type: z.enum(["mcq_single", "mcq_multi", "short_answer", "passage"]),
  stem: z.string().min(1),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
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
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  try {
    const items = await controllerListQuestions({
      subjectId: searchParams.get("subjectId") ?? undefined,
      difficulty: (searchParams.get("difficulty") ?? undefined) as
        | "easy"
        | "medium"
        | "hard"
        | "mixed"
        | undefined,
      status: (searchParams.get("status") ?? undefined) as
        | "active"
        | "archived"
        | undefined,
      search: searchParams.get("search") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
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
      createdBy: auth.sub,
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tạo câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
