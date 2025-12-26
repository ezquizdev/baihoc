import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";
import type { UserStatus } from "@/application/infra/db/userRepo";

export type UserStatusChangeRow = {
  id: string;
  user_id: string;
  from_status: UserStatus;
  to_status: UserStatus;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
};

export async function insertUserStatusChange(
  input: {
    userId: string;
    fromStatus: UserStatus;
    toStatus: UserStatus;
    reason?: string | null;
    changedBy?: string | null;
  },
  client?: PoolClient,
) {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO user_status_changes (user_id, from_status, to_status, reason, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.fromStatus,
      input.toStatus,
      input.reason ?? null,
      input.changedBy ?? null,
    ],
  );
}

export async function listUserStatusChanges(
  userId: string,
  limit = 50,
  client?: PoolClient,
) {
  const executor = client ?? pool;
  const res = await executor.query<UserStatusChangeRow>(
    `SELECT * FROM user_status_changes
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
}
