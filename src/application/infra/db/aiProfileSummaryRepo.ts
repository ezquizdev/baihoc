import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";

export type AiProfileSummaryRow = {
  user_id: string;
  status: "pending" | "processing" | "failed" | "completed";
  summary_markdown: string | null;
  error_message: string | null;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export async function getAiProfileSummary(
  userId: string,
  client?: PoolClient,
): Promise<AiProfileSummaryRow | null> {
  const executor = client ?? pool;
  const res = await executor.query<AiProfileSummaryRow>(
    `SELECT *
     FROM ai_profile_summaries
     WHERE user_id = $1::uuid
     LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function upsertAiProfileSummaryRequest(
  input: { userId: string; requestedBy: string | null },
  client?: PoolClient,
): Promise<AiProfileSummaryRow> {
  const executor = client ?? pool;
  const res = await executor.query<AiProfileSummaryRow>(
    `INSERT INTO ai_profile_summaries (user_id, status, requested_by, requested_at, updated_at)
     VALUES ($1::uuid, 'pending'::job_status, $2::uuid, now(), now())
     ON CONFLICT (user_id) DO UPDATE
     SET status = CASE
       WHEN ai_profile_summaries.status = 'processing'::job_status
       THEN ai_profile_summaries.status
       ELSE 'pending'::job_status
     END,
     requested_by = EXCLUDED.requested_by,
     requested_at = now(),
     updated_at = now(),
     error_message = NULL
     RETURNING *`,
    [input.userId, input.requestedBy],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to request ai_profile_summary");
  return row;
}

export async function claimAiProfileSummaryJob(
  userId: string,
  client?: PoolClient,
): Promise<AiProfileSummaryRow | null> {
  const executor = client ?? pool;
  const res = await executor.query<AiProfileSummaryRow>(
    `UPDATE ai_profile_summaries
     SET status = 'processing'::job_status,
         started_at = now(),
         updated_at = now(),
         error_message = NULL
     WHERE user_id = $1::uuid
       AND status = 'pending'::job_status
     RETURNING *`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function completeAiProfileSummaryJob(
  input: { userId: string; summaryMarkdown: string },
  client?: PoolClient,
): Promise<AiProfileSummaryRow> {
  const executor = client ?? pool;
  const res = await executor.query<AiProfileSummaryRow>(
    `UPDATE ai_profile_summaries
     SET status = 'completed'::job_status,
         summary_markdown = $2,
         error_message = NULL,
         completed_at = now(),
         updated_at = now()
     WHERE user_id = $1::uuid
     RETURNING *`,
    [input.userId, input.summaryMarkdown],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to complete ai_profile_summary");
  return row;
}

export async function failAiProfileSummaryJob(
  input: { userId: string; errorMessage: string },
  client?: PoolClient,
): Promise<AiProfileSummaryRow> {
  const executor = client ?? pool;
  const res = await executor.query<AiProfileSummaryRow>(
    `UPDATE ai_profile_summaries
     SET status = 'failed'::job_status,
         error_message = $2,
         updated_at = now()
     WHERE user_id = $1::uuid
     RETURNING *`,
    [input.userId, input.errorMessage],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to fail ai_profile_summary");
  return row;
}
