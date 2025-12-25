import type { PoolClient } from "pg";
import { query } from "@/application/infra/db/pool";

export type XpSource = "attempt" | "challenge" | "streak" | "admin_adjust";

export type XpEventInput = {
  userId: string;
  source: XpSource;
  amount: number;
  metadata?: Record<string, unknown> | null;
};

export async function insertXpEvent(input: XpEventInput, client?: PoolClient) {
  const sql = `INSERT INTO xp_events (user_id, source, amount, metadata)
               VALUES ($1, $2::xp_source, $3, $4)`;
  const params = [
    input.userId,
    input.source,
    input.amount,
    input.metadata ?? null,
  ];
  if (client) {
    await client.query(sql, params);
    return;
  }
  await query(sql, params);
}
