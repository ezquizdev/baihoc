import { query } from "@/application/infra/db/pool";
import type { LeaderboardEntry } from "@/application/models/leaderboard";

type LeaderboardRow = {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  xp_total: number;
};

function mapLeaderboardRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    fullName: row.full_name || row.email,
    avatarUrl: row.avatar_url,
    xp: Number(row.xp_total),
  };
}

export async function listTopXp(limit = 7): Promise<LeaderboardEntry[]> {
  const res = await query<LeaderboardRow>(
    `SELECT u.id AS user_id,
            u.full_name,
            u.email,
            u.avatar_url,
            SUM(x.amount)::int AS xp_total
     FROM xp_events x
     JOIN users u ON u.id = x.user_id
     WHERE u.role = 'student'
     GROUP BY u.id, u.full_name, u.email, u.avatar_url
     ORDER BY xp_total DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows.map(mapLeaderboardRow);
}
