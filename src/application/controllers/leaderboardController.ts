import type { LeaderboardEntry } from "@/application/models/leaderboard";
import { listLeaderboardTop } from "@/application/services/leaderboardService";

export async function controllerListTopLeaderboard(
  limit = 7,
): Promise<LeaderboardEntry[]> {
  return listLeaderboardTop(limit);
}
