import { type NextRequest, NextResponse } from "next/server";
import { parsePagination } from "@/app/api/_utils/query";
import { controllerGetLeaderboardTable } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import {
  type LeaderboardSortBy,
  LeaderboardSortByValues,
  type LeaderboardSortDir,
  LeaderboardSortDirValues,
} from "@/application/models/leaderboard";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(
    searchParams,
    { limit: 20, offset: 0 },
    100,
  );
  const includeSelf = parseBoolean(searchParams, "includeSelf") ?? true;
  const sortBy = parseSortBy(searchParams.get("sortBy")) ?? "overall";
  const sortDir = parseSortDir(searchParams.get("sortDir")) ?? "desc";

  try {
    const result = await controllerGetLeaderboardTable({
      viewerUserId: auth.sub,
      limit,
      offset,
      sortBy,
      sortDir,
      includeSelf,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải leaderboard";
    return NextResponse.json({ error: message }, { status: 400 });
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

function parseBoolean(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return undefined;
}
