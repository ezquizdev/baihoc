import {
  getLeaderboard,
  getLeaderboardTable,
  searchLeaderboardTableEntriesByFullName,
} from "@/application/infra/db/leaderboardRepo";
import type {
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableEntry,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";
import { ServiceError } from "@/application/services/errors";

export async function getLeaderboardForViewer(params: {
  viewerUserId: string;
  limit: number;
  includeSelf: boolean;
  subjectId?: string | null;
}) {
  return getLeaderboard(params);
}

export async function getLeaderboardTableForViewer(params: {
  viewerUserId: string;
  limit: number;
  offset: number;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
  includeSelf: boolean;
}): Promise<LeaderboardTableResult> {
  return getLeaderboardTable(params);
}

export async function getLeaderboardTableEntriesForSearch(params: {
  query: string;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
}): Promise<LeaderboardTableEntry[]> {
  const raw = params.query.trim();
  if (!raw) {
    throw new ServiceError(
      "INVALID_QUERY",
      "Từ khoá tìm kiếm không hợp lệ",
      400,
    );
  }

  return searchLeaderboardTableEntriesByFullName({
    query: raw,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
}
