import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "@/core/env";

if (typeof window !== "undefined") {
  throw new Error("db pool can only be imported on the server.");
}

const globalForPool = globalThis as typeof globalThis & {
  __baihocPool?: Pool;
};

export const pool =
  globalForPool.__baihocPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
  });

globalForPool.__baihocPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const res = await pool.query<T>(text, params);
  return res;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
