import type {
  LeaderboardResult,
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableEntry,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";
import {
  getLeaderboardForViewer,
  getLeaderboardTableEntriesForSearch,
  getLeaderboardTableForViewer,
} from "@/application/services/leaderboardService";

export async function controllerGetLeaderboard(params: {
  viewerUserId: string;
  limit: number;
  includeSelf: boolean;
  subjectId?: string | null;
}): Promise<LeaderboardResult> {
  return getLeaderboardForViewer(params);
}

export async function controllerGetLeaderboardTable(params: {
  viewerUserId: string;
  limit: number;
  offset: number;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
  includeSelf: boolean;
}): Promise<LeaderboardTableResult> {
  return getLeaderboardTableForViewer(params);
}

export async function controllerSearchLeaderboardTableEntries(params: {
  query: string;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
}): Promise<LeaderboardTableEntry[]> {
  return getLeaderboardTableEntriesForSearch(params);
}
