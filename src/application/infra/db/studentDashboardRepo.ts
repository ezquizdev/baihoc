import { query } from "@/application/infra/db/pool";
import type { AttemptStatus } from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/question";

type ActiveChallengePreviewRow = {
  quiz_id: string;
  quiz_title: string | null;
  start_at: string;
  end_at: string;
  question_id: string | null;
  question_stem: string | null;
  question_type: QuestionType | null;
  options: unknown;
  attempt_id: string | null;
  attempt_status: AttemptStatus | null;
};

export type StudentActiveChallengePreview = {
  quizId: string;
  quizTitle: string | null;
  startAt: string;
  endAt: string;
  question: {
    id: string;
    stem: string;
    type: QuestionType;
    options: Array<{ id: string; content: string; position: number }>;
  } | null;
  attempt: {
    id: string;
    status: AttemptStatus;
  } | null;
};

function safeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string") return null;
      if (typeof record.content !== "string") return null;
      const positionRaw = record.position;
      const position =
        typeof positionRaw === "number" ? positionRaw : Number(positionRaw);
      if (!Number.isFinite(position)) return null;
      return { id: record.id, content: record.content, position };
    })
    .filter((item): item is { id: string; content: string; position: number } =>
      Boolean(item),
    )
    .sort((a, b) => a.position - b.position);
}

export async function getActiveChallengePreviewForUser(userId: string) {
  const res = await query<ActiveChallengePreviewRow>(
    `WITH active AS (
      SELECT q.id AS quiz_id,
             q.title AS quiz_title,
             cs.start_at,
             cs.end_at
      FROM quizzes q
      JOIN challenge_settings cs ON cs.quiz_id = q.id
      WHERE q.status = 'published'
        AND q.is_challenge IS TRUE
        AND cs.start_at <= now()
        AND cs.end_at > now()
      ORDER BY cs.end_at ASC, q.id ASC
      LIMIT 1
    ),
    first_question AS (
      SELECT qq.quiz_id, qq.question_id
      FROM quiz_questions qq
      JOIN active a ON a.quiz_id = qq.quiz_id
      ORDER BY qq.position ASC, qq.question_id ASC
      LIMIT 1
    )
    SELECT a.quiz_id,
           a.quiz_title,
           a.start_at,
           a.end_at,
           qn.id AS question_id,
           qn.stem AS question_stem,
           qn.type AS question_type,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', qo.id,
                 'content', qo.content,
                 'position', qo.position
               )
               ORDER BY qo.position ASC
             ) FILTER (WHERE qo.id IS NOT NULL),
             '[]'::json
           ) AS options,
           att.id AS attempt_id,
           att.status AS attempt_status
    FROM active a
    LEFT JOIN attempts att
      ON att.user_id = $1
     AND att.challenge_id = a.quiz_id
    LEFT JOIN first_question fq ON fq.quiz_id = a.quiz_id
    LEFT JOIN questions qn ON qn.id = fq.question_id
    LEFT JOIN question_options qo ON qo.question_id = qn.id
    GROUP BY a.quiz_id,
             a.quiz_title,
             a.start_at,
             a.end_at,
             qn.id,
             qn.stem,
             qn.type,
             att.id,
             att.status`,
    [userId],
  );

  const row = res.rows[0];
  if (!row) return null;

  const question =
    row.question_id && row.question_stem && row.question_type
      ? {
          id: row.question_id,
          stem: row.question_stem,
          type: row.question_type,
          options: safeOptions(row.options),
        }
      : null;

  const attempt =
    row.attempt_id && row.attempt_status
      ? { id: row.attempt_id, status: row.attempt_status }
      : null;

  return {
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    startAt: row.start_at,
    endAt: row.end_at,
    question,
    attempt,
  } satisfies StudentActiveChallengePreview;
}
