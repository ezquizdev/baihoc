import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";
import type { AiEntryPoint, AiMessageRole } from "@/application/models/enums";

export type AiSessionRow = {
  id: string;
  user_id: string;
  entry_point: AiEntryPoint;
  quiz_id: string | null;
  attempt_id: string | null;
  question_id: string | null;
  created_at: string;
};

export type AiMessageRow = {
  id: string;
  session_id: string;
  role: AiMessageRole;
  content: string;
  token_usage: unknown | null;
  created_at: string;
};

export type AiFailureRow = {
  id: string;
  session_id: string;
  error_type: string;
  message: string;
  created_at: string;
};

export async function findAiSessionById(
  input: { userId: string; sessionId: string },
  client?: PoolClient,
): Promise<AiSessionRow | null> {
  const executor = client ?? pool;
  const res = await executor.query<AiSessionRow>(
    `SELECT *
     FROM ai_sessions
     WHERE id = $1::uuid AND user_id = $2::uuid
     LIMIT 1`,
    [input.sessionId, input.userId],
  );
  return res.rows[0] ?? null;
}

export async function findLatestAiSessionForContext(
  input: {
    userId: string;
    entryPoint: AiEntryPoint;
    attemptId?: string | null;
    questionId?: string | null;
  },
  client?: PoolClient,
): Promise<AiSessionRow | null> {
  const executor = client ?? pool;
  const params: unknown[] = [input.userId, input.entryPoint];
  const conditions = [`user_id = $1::uuid`, `entry_point = $2::ai_entry_point`];

  switch (input.entryPoint) {
    case "home": {
      conditions.push(`attempt_id IS NULL`);
      conditions.push(`question_id IS NULL`);
      break;
    }
    case "result": {
      params.push(input.attemptId ?? null);
      conditions.push(`attempt_id = $${params.length}::uuid`);
      conditions.push(`question_id IS NULL`);
      break;
    }
    case "question": {
      params.push(input.attemptId ?? null);
      conditions.push(`attempt_id = $${params.length}::uuid`);
      params.push(input.questionId ?? null);
      conditions.push(`question_id = $${params.length}::uuid`);
      break;
    }
  }

  const res = await executor.query<AiSessionRow>(
    `SELECT *
     FROM ai_sessions
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT 1`,
    params,
  );
  return res.rows[0] ?? null;
}

export async function insertAiSession(
  input: {
    userId: string;
    entryPoint: AiEntryPoint;
    quizId?: string | null;
    attemptId?: string | null;
    questionId?: string | null;
  },
  client?: PoolClient,
): Promise<AiSessionRow> {
  const executor = client ?? pool;
  const res = await executor.query<AiSessionRow>(
    `INSERT INTO ai_sessions (user_id, entry_point, quiz_id, attempt_id, question_id)
     VALUES ($1::uuid, $2::ai_entry_point, $3::uuid, $4::uuid, $5::uuid)
     RETURNING *`,
    [
      input.userId,
      input.entryPoint,
      input.quizId ?? null,
      input.attemptId ?? null,
      input.questionId ?? null,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to create ai_session");
  return row;
}

export async function listAiMessagesForSession(
  input: { userId: string; sessionId: string; limit?: number },
  client?: PoolClient,
): Promise<AiMessageRow[]> {
  const executor = client ?? pool;
  const limit = input.limit ?? 50;
  const res = await executor.query<AiMessageRow>(
    `SELECT m.*
     FROM ai_messages m
     JOIN ai_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1::uuid AND s.id = $2::uuid
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [input.userId, input.sessionId, limit],
  );
  return res.rows.reverse();
}

export async function insertAiMessage(
  input: {
    sessionId: string;
    role: AiMessageRole;
    content: string;
    tokenUsage?: unknown;
  },
  client?: PoolClient,
): Promise<AiMessageRow> {
  const executor = client ?? pool;
  const res = await executor.query<AiMessageRow>(
    `INSERT INTO ai_messages (session_id, role, content, token_usage)
     VALUES ($1::uuid, $2::ai_message_role, $3, $4::jsonb)
     RETURNING *`,
    [
      input.sessionId,
      input.role,
      input.content,
      input.tokenUsage ? JSON.stringify(input.tokenUsage) : null,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to create ai_message");
  return row;
}

export async function insertAiFailure(
  input: { sessionId: string; errorType: string; message: string },
  client?: PoolClient,
) {
  const executor = client ?? pool;
  await executor.query<AiFailureRow>(
    `INSERT INTO ai_failures (session_id, error_type, message)
     VALUES ($1::uuid, $2, $3)`,
    [input.sessionId, input.errorType, input.message],
  );
}
