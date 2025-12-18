import { type NextRequest, NextResponse } from "next/server";
import {
  parseCommaIds,
  parseDifficulty,
  parseNumber,
  parsePagination,
  parseQuizVisibility,
} from "@/app/api/_utils/query";
import { controllerListCatalog } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

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

  try {
    const items = await controllerListCatalog({
      subjectId: searchParams.get("subjectId") ?? undefined,
      topicIds: parseCommaIds(searchParams, "topicIds"),
      difficulty: parseDifficulty(searchParams),
      visibility: parseQuizVisibility(searchParams),
      search: searchParams.get("search") ?? undefined,
      limit,
      offset,
      minQuestions: parseNumber(searchParams, "minQuestions"),
      maxQuestions: parseNumber(searchParams, "maxQuestions"),
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
