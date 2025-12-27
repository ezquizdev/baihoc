import {
  getLeaderboard,
  getLeaderboardTable,
} from "@/application/infra/db/leaderboardRepo";
import type {
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";

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
