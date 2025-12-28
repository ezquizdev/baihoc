import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  parseCommaIds,
  parseBoolean,
  parseDifficulty,
  parseEnumArray,
  parseNumberArray,
  parsePagination,
  parseQuestionStatus,
  parseQuestionType,
} from "@/app/api/_utils/query";
import {
  controllerCreateQuestion,
  controllerListQuestions,
} from "@/application/controllers/questionController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  type DifficultyLevel,
  QuestionStatusValues,
  QuestionTypeValues,
} from "@/application/models/enums";
import {
  type QuestionSortBy,
  QuestionSortByValues,
  type QuestionSortDir,
  QuestionSortDirValues,
} from "@/application/models/questionList";

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
    const legacySubjectId = searchParams.get("subjectId") ?? undefined;
    const legacyDifficulty = parseDifficulty(searchParams) as
      | DifficultyLevel
      | undefined;
    const legacyType = parseQuestionType(searchParams);
    const legacyStatus = parseQuestionStatus(searchParams);

    const sortBy = parseSortBy(searchParams.get("sortBy")) ?? "updatedAt";
    const sortDir = parseSortDir(searchParams.get("sortDir")) ?? "desc";

    const subjectIds =
      parseCommaIds(searchParams, "subjectIds") ??
      (legacySubjectId ? [legacySubjectId] : undefined);

    let difficultyLevels = parseNumberArray(searchParams, "difficultyLevels", {
      min: 1,
      max: 5,
    })?.filter((value) => Number.isInteger(value)) as
      | DifficultyLevel[]
      | undefined;
    if (!difficultyLevels?.length && legacyDifficulty !== undefined) {
      difficultyLevels = [legacyDifficulty];
    }

    let types = parseEnumArray(searchParams, "types", QuestionTypeValues);
    if (!types?.length && legacyType) types = [legacyType];

    let statuses = parseEnumArray(
      searchParams,
      "statuses",
      QuestionStatusValues,
    );
    if (!statuses?.length && legacyStatus) statuses = [legacyStatus];
    if (!statuses?.length) statuses = ["active"];
    const hasPassage = parseBoolean(searchParams, "hasPassage");

    const result = await controllerListQuestions({
      subjectIds,
      difficultyLevels,
      types,
      statuses,
      hasPassage,
      search: searchParams.get("search") ?? undefined,
      sortBy,
      sortDir,
      limit,
      offset,
    });
    return NextResponse.json({ items: result.items, total: result.total });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải câu hỏi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseSortBy(value: string | null): QuestionSortBy | undefined {
  if (!value) return undefined;
  return QuestionSortByValues.includes(value as QuestionSortBy)
    ? (value as QuestionSortBy)
    : undefined;
}

function parseSortDir(value: string | null): QuestionSortDir | undefined {
  if (!value) return undefined;
  return QuestionSortDirValues.includes(value as QuestionSortDir)
    ? (value as QuestionSortDir)
    : undefined;
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
