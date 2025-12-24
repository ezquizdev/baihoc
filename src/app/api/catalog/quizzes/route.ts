import { type NextRequest, NextResponse } from "next/server";
import {
  parseCommaIds,
  parseEnumArray,
  parseNumberRange,
  parsePagination,
} from "@/app/api/_utils/query";
import { controllerListCatalogPage } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { DifficultyLabelValues } from "@/application/models/enums";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    limit: 20,
    offset: 0,
  });
  const status = parseStatus(searchParams.get("status"));
  const sort = parseSort(searchParams.get("sort"));
  const { min: minQuestions, max: maxQuestions } = parseNumberRange(
    searchParams,
    "minQuestions",
    "maxQuestions",
  );
  const { min: minDuration, max: maxDuration } = parseNumberRange(
    searchParams,
    "minDuration",
    "maxDuration",
  );

  try {
    const difficultyLabels = parseEnumArray(
      searchParams,
      "difficultyLabels",
      DifficultyLabelValues,
    );

    const { items, total } = await controllerListCatalogPage(auth.sub, {
      subjectIds: parseCommaIds(searchParams, "subjectIds"),
      difficulty: difficultyLabels,
      search: searchParams.get("search") ?? searchParams.get("q") ?? undefined,
      status,
      sort,
      limit,
      offset,
      minQuestions,
      maxQuestions,
      minDurationMinutes: minDuration,
      maxDurationMinutes: maxDuration,
    });
    return NextResponse.json({ items, total });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseStatus(value: string | null) {
  if (!value) return undefined;
  if (value === "todo" || value === "done" || value === "all") return value;
  return undefined;
}

function parseSort(value: string | null) {
  if (!value) return undefined;
  if (value === "newest" || value === "oldest") return value;
  return undefined;
}
