import { listTopXp } from "@/application/infra/db/leaderboardRepo";

export async function listLeaderboardTop(limit = 7) {
  return listTopXp(limit);
}
