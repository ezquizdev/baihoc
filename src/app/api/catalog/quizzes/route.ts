import { type NextRequest, NextResponse } from "next/server";
import { controllerListCatalog } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  const topicIdsParam = searchParams.get("topicIds");
  const topicIds = topicIdsParam
    ? topicIdsParam.split(",").filter(Boolean)
    : undefined;

  try {
    const items = await controllerListCatalog({
      subjectId: searchParams.get("subjectId") ?? undefined,
      topicIds,
      difficulty: (searchParams.get("difficulty") ?? undefined) as
        | "easy"
        | "medium"
        | "hard"
        | "mixed"
        | undefined,
      visibility: (searchParams.get("visibility") ?? undefined) as
        | "free"
        | "premium"
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
