import type { PoolClient } from "pg";
import { query } from "@/application/infra/db/pool";

type QuestionIrtStatsRow = {
  question_id: string;
  first_attempt_count: number | string;
  first_correct_count: number | string;
};

function toInt(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export type QuestionIrtStats = {
  questionId: string;
  firstAttemptCount: number;
  firstCorrectCount: number;
};

export async function listQuestionIrtStats(
  questionIds: string[],
  client?: PoolClient,
): Promise<QuestionIrtStats[]> {
  if (!questionIds.length) return [];
  const res = client
    ? await client.query<QuestionIrtStatsRow>(
        `SELECT question_id,
                first_attempt_count,
                first_correct_count
         FROM question_irt_stats
         WHERE question_id = ANY($1::uuid[])`,
        [questionIds],
      )
    : await query<QuestionIrtStatsRow>(
        `SELECT question_id,
                first_attempt_count,
                first_correct_count
         FROM question_irt_stats
         WHERE question_id = ANY($1::uuid[])`,
        [questionIds],
      );
  return res.rows.map((row) => ({
    questionId: row.question_id,
    firstAttemptCount: toInt(row.first_attempt_count),
    firstCorrectCount: toInt(row.first_correct_count),
  }));
}

export async function getOrCreateUserQuizFirstAttempt(
  client: PoolClient,
  params: { userId: string; quizId: string; attemptId: string },
): Promise<{ isFirst: boolean }> {
  const insertRes = await client.query(
    `INSERT INTO user_quiz_first_attempts (user_id, quiz_id, attempt_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, quiz_id) DO NOTHING`,
    [params.userId, params.quizId, params.attemptId],
  );
  if ((insertRes.rowCount ?? 0) > 0) {
    return { isFirst: true };
  }

  const existingRes = await client.query<{ attempt_id: string }>(
    `SELECT attempt_id
     FROM user_quiz_first_attempts
     WHERE user_id = $1 AND quiz_id = $2
     LIMIT 1`,
    [params.userId, params.quizId],
  );
  const existingAttemptId = existingRes.rows[0]?.attempt_id ?? null;
  return { isFirst: existingAttemptId === params.attemptId };
}

export async function applyQuestionIrtStatsDelta(
  client: PoolClient,
  deltas: Array<{
    questionId: string;
    attemptDelta: number;
    correctDelta: number;
  }>,
) {
  const filtered = deltas.filter(
    (delta) =>
      delta.questionId &&
      (delta.attemptDelta !== 0 || delta.correctDelta !== 0),
  );
  if (!filtered.length) return;

  const values: string[] = [];
  const params: unknown[] = [];
  filtered.forEach((delta, index) => {
    const base = index * 3;
    values.push(
      `($${base + 1}::uuid, $${base + 2}::int, $${base + 3}::int, now())`,
    );
    params.push(delta.questionId, delta.attemptDelta, delta.correctDelta);
  });

  await client.query(
    `INSERT INTO question_irt_stats (
       question_id,
       first_attempt_count,
       first_correct_count,
       updated_at
     ) VALUES ${values.join(", ")}
     ON CONFLICT (question_id) DO UPDATE
       SET first_attempt_count = GREATEST(0, question_irt_stats.first_attempt_count + EXCLUDED.first_attempt_count),
           first_correct_count = GREATEST(0, question_irt_stats.first_correct_count + EXCLUDED.first_correct_count),
           updated_at = EXCLUDED.updated_at`,
    params,
  );
}
