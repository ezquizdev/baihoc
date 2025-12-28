import { type NextRequest, NextResponse } from "next/server";
import { controllerSearchLeaderboardTableEntries } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  type LeaderboardSortBy,
  LeaderboardSortByValues,
  type LeaderboardSortDir,
  LeaderboardSortDirValues,
} from "@/application/models/leaderboard";
import { isServiceError } from "@/application/services/errors";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "Từ khoá tìm kiếm không hợp lệ" },
      { status: 400 },
    );
  }

  const sortBy = parseSortBy(searchParams.get("sortBy")) ?? "overall";
  const sortDir = parseSortDir(searchParams.get("sortDir")) ?? "desc";

  try {
    const items = await controllerSearchLeaderboardTableEntries({
      query,
      sortBy,
      sortDir,
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tìm xếp hạng";
    const status = isServiceError(error) ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function parseSortBy(value: string | null): LeaderboardSortBy | undefined {
  if (!value) return undefined;
  return LeaderboardSortByValues.includes(value as LeaderboardSortBy)
    ? (value as LeaderboardSortBy)
    : undefined;
}

function parseSortDir(value: string | null): LeaderboardSortDir | undefined {
  if (!value) return undefined;
  return LeaderboardSortDirValues.includes(value as LeaderboardSortDir)
    ? (value as LeaderboardSortDir)
    : undefined;
}
