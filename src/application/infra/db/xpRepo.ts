import type { PoolClient } from "pg";
import { query } from "@/application/infra/db/pool";

export type XpSource = "attempt" | "challenge" | "streak" | "admin_adjust";

export type XpEventInput = {
  userId: string;
  source: XpSource;
  amount: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export async function insertXpEvent(input: XpEventInput, client?: PoolClient) {
  const hasCreatedAt = input.createdAt !== undefined;
  const sql = hasCreatedAt
    ? `INSERT INTO xp_events (user_id, source, amount, metadata, created_at)
               VALUES ($1, $2::xp_source, $3, $4, $5::timestamptz)`
    : `INSERT INTO xp_events (user_id, source, amount, metadata)
               VALUES ($1, $2::xp_source, $3, $4)`;
  const params = hasCreatedAt
    ? [
        input.userId,
        input.source,
        input.amount,
        input.metadata ?? null,
        input.createdAt,
      ]
    : [input.userId, input.source, input.amount, input.metadata ?? null];
  if (client) {
    await client.query(sql, params);
    return;
  }
  await query(sql, params);
}
