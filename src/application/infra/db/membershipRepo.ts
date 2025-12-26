import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";
import type { UserTier } from "@/application/infra/db/userRepo";

export type MembershipHistoryRow = {
  id: string;
  user_id: string;
  from_tier: UserTier;
  to_tier: UserTier;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
};

export async function insertMembershipHistory(
  input: {
    userId: string;
    fromTier: UserTier;
    toTier: UserTier;
    reason?: string | null;
    changedBy?: string | null;
  },
  client?: PoolClient,
) {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO membership_history (user_id, from_tier, to_tier, reason, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.fromTier,
      input.toTier,
      input.reason ?? null,
      input.changedBy ?? null,
    ],
  );
}

export async function listMembershipHistory(
  userId: string,
  limit = 50,
  client?: PoolClient,
) {
  const executor = client ?? pool;
  const res = await executor.query<MembershipHistoryRow>(
    `SELECT * FROM membership_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
}

export async function insertAllowlistUpgrade(
  userId: string,
  client?: PoolClient,
) {
  await insertMembershipHistory(
    {
      userId,
      fromTier: "free",
      toTier: "paid",
      reason: "allowlist auto-upgrade",
      changedBy: null,
    },
    client,
  );
}
