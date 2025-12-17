import { Pool } from "pg";
import { env } from "@/core/env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function query<T = unknown>(text: string, params?: unknown[]) {
  const res = await pool.query<T>(text, params);
  return res;
}
