import { query, withTransaction } from "@/application/infra/db/pool";
import type { AttemptStatus } from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/question";

type HighlightConfigRow = {
  quiz_id: string | null;
  question_id: string | null;
  updated_at: string;
  updated_by_email: string | null;
  quiz_title: string | null;
  question_stem: string | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
};

export type HighlightConfig = {
  quizId: string | null;
  questionId: string | null;
  updatedAt: string;
  updatedByEmail: string | null;
  quizTitle: string | null;
  questionStem: string | null;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
};

type ActiveChallengeRow = {
  quiz_id: string;
  quiz_title: string | null;
  start_at: string;
  end_at: string;
};

export type ActiveChallenge = {
  quizId: string;
  quizTitle: string | null;
  startAt: string;
  endAt: string;
};

type HighlightCardRow = {
  quiz_id: string;
  quiz_title: string | null;
  start_at: string;
  end_at: string;
  question_id: string;
  question_stem: string;
  question_type: QuestionType;
  question_explanation: string | null;
  options: unknown;
  attempt_id: string | null;
  attempt_status: AttemptStatus | null;
  submission_selected_option_ids: string[] | null;
  submission_is_correct: boolean | null;
  submission_created_at: string | null;
};

export type HighlightCardSnapshot = {
  quizId: string;
  quizTitle: string | null;
  startAt: string;
  endAt: string;
  question: {
    id: string;
    stem: string;
    type: QuestionType;
    explanation: string | null;
    options: Array<{
      id: string;
      text: string;
      position: number;
      isCorrect: boolean;
    }>;
  };
  attempt: { id: string; status: AttemptStatus } | null;
  submission: {
    selectedOptionIds: string[];
    isCorrect: boolean;
    createdAt: string;
  } | null;
};

function safeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string") return null;
      if (typeof record.text !== "string") return null;
      const positionRaw = record.position;
      const position =
        typeof positionRaw === "number" ? positionRaw : Number(positionRaw);
      if (!Number.isFinite(position)) return null;
      const isCorrect = Boolean(record.isCorrect);
      return { id: record.id, text: record.text, position, isCorrect };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        text: string;
        position: number;
        isCorrect: boolean;
      } => Boolean(item),
    )
    .sort((a, b) => a.position - b.position);
}

export async function listActiveChallenges(): Promise<ActiveChallenge[]> {
  const res = await query<ActiveChallengeRow>(
    `SELECT q.id AS quiz_id,
            q.title AS quiz_title,
            cs.start_at,
            cs.end_at
     FROM quizzes q
     JOIN challenge_settings cs ON cs.quiz_id = q.id
     WHERE q.status = 'published'
       AND q.is_challenge IS TRUE
       AND cs.start_at <= now()
       AND cs.end_at > now()
     ORDER BY cs.end_at ASC, q.id ASC`,
    [],
  );
  return res.rows.map((row) => ({
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    startAt: row.start_at,
    endAt: row.end_at,
  }));
}

export async function getHighlightConfig(): Promise<HighlightConfig | null> {
  const res = await query<HighlightConfigRow>(
    `SELECT cfg.quiz_id,
            cfg.question_id,
            cfg.updated_at,
            u.email AS updated_by_email,
            q.title AS quiz_title,
            qn.stem AS question_stem,
            cs.start_at,
            cs.end_at,
            CASE
              WHEN cs.start_at IS NULL OR cs.end_at IS NULL THEN false
              WHEN q.status <> 'published' OR q.is_challenge IS NOT TRUE THEN false
              ELSE cs.start_at <= now() AND cs.end_at > now()
            END AS is_active
     FROM dashboard_highlight_challenge cfg
     LEFT JOIN users u ON u.id = cfg.updated_by
     LEFT JOIN quizzes q ON q.id = cfg.quiz_id
     LEFT JOIN challenge_settings cs ON cs.quiz_id = cfg.quiz_id
     LEFT JOIN questions qn ON qn.id = cfg.question_id
     WHERE cfg.id = 1`,
    [],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    quizId: row.quiz_id,
    questionId: row.question_id,
    updatedAt: row.updated_at,
    updatedByEmail: row.updated_by_email,
    quizTitle: row.quiz_title,
    questionStem: row.question_stem,
    startAt: row.start_at,
    endAt: row.end_at,
    isActive: Boolean(row.is_active),
  };
}

export async function upsertHighlightConfig(input: {
  quizId: string | null;
  questionId: string | null;
  updatedBy: string;
}) {
  await query(
    `INSERT INTO dashboard_highlight_challenge (
       id,
       quiz_id,
       question_id,
       updated_by,
       updated_at
     ) VALUES (1, $1, $2, $3, now())
     ON CONFLICT (id)
     DO UPDATE SET quiz_id = EXCLUDED.quiz_id,
                   question_id = EXCLUDED.question_id,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = EXCLUDED.updated_at`,
    [input.quizId, input.questionId, input.updatedBy],
  );
}

export async function getActiveHighlightCardSnapshotForUser(
  userId: string,
): Promise<HighlightCardSnapshot | null> {
  const res = await query<HighlightCardRow>(
    `WITH cfg AS (
      SELECT quiz_id, question_id
      FROM dashboard_highlight_challenge
      WHERE id = 1
        AND quiz_id IS NOT NULL
        AND question_id IS NOT NULL
    ),
    active AS (
      SELECT q.id AS quiz_id,
             q.title AS quiz_title,
             cs.start_at,
             cs.end_at,
             cfg.question_id
      FROM cfg
      JOIN quizzes q ON q.id = cfg.quiz_id
      JOIN challenge_settings cs ON cs.quiz_id = q.id
      WHERE q.status = 'published'
        AND q.is_challenge IS TRUE
        AND cs.start_at <= now()
        AND cs.end_at > now()
    )
    SELECT a.quiz_id,
           a.quiz_title,
           a.start_at,
           a.end_at,
           qn.id AS question_id,
           qn.stem AS question_stem,
           qn.type AS question_type,
           qn.explanation AS question_explanation,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', qo.id,
                 'text', qo.text,
                 'position', qo.position,
                 'isCorrect', qo.is_correct
               )
               ORDER BY qo.position ASC
             ) FILTER (WHERE qo.id IS NOT NULL),
             '[]'::json
           ) AS options,
           att.id AS attempt_id,
           att.status AS attempt_status,
           sub.selected_option_ids AS submission_selected_option_ids,
           sub.is_correct AS submission_is_correct,
           sub.created_at AS submission_created_at
    FROM active a
    JOIN questions qn ON qn.id = a.question_id
    LEFT JOIN question_options qo ON qo.question_id = qn.id
    LEFT JOIN attempts att
      ON att.user_id = $1
     AND att.challenge_id = a.quiz_id
    LEFT JOIN dashboard_highlight_challenge_submissions sub
      ON sub.user_id = $1
     AND sub.quiz_id = a.quiz_id
     AND sub.question_id = qn.id
    GROUP BY a.quiz_id,
             a.quiz_title,
             a.start_at,
             a.end_at,
             qn.id,
             qn.stem,
             qn.type,
             qn.explanation,
             att.id,
             att.status,
             sub.selected_option_ids,
             sub.is_correct,
             sub.created_at`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;

  const options = safeOptions(row.options);

  return {
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    startAt: row.start_at,
    endAt: row.end_at,
    question: {
      id: row.question_id,
      stem: row.question_stem,
      type: row.question_type,
      explanation: row.question_explanation,
      options,
    },
    attempt:
      row.attempt_id && row.attempt_status
        ? { id: row.attempt_id, status: row.attempt_status }
        : null,
    submission:
      row.submission_selected_option_ids &&
      row.submission_is_correct !== null &&
      row.submission_created_at
        ? {
            selectedOptionIds: row.submission_selected_option_ids.filter(
              (id): id is string => typeof id === "string",
            ),
            isCorrect: Boolean(row.submission_is_correct),
            createdAt: row.submission_created_at,
          }
        : null,
  };
}

type QuizChallengeWindowRow = {
  quiz_id: string;
  quiz_title: string | null;
  start_at: string;
  end_at: string;
};

export async function getActiveChallengeWindowById(quizId: string): Promise<{
  quizId: string;
  quizTitle: string | null;
  startAt: string;
  endAt: string;
} | null> {
  const res = await query<QuizChallengeWindowRow>(
    `SELECT q.id AS quiz_id,
            q.title AS quiz_title,
            cs.start_at,
            cs.end_at
     FROM quizzes q
     JOIN challenge_settings cs ON cs.quiz_id = q.id
     WHERE q.id = $1
       AND q.status = 'published'
       AND q.is_challenge IS TRUE
       AND cs.start_at <= now()
       AND cs.end_at > now()`,
    [quizId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    startAt: row.start_at,
    endAt: row.end_at,
  };
}

type HighlightQuestionRow = {
  type: QuestionType;
  stem: string;
  explanation: string | null;
};

type HighlightOptionRow = {
  id: string;
  text: string;
  is_correct: boolean;
  position: number;
};

export async function getChallengeQuestionForHighlight(input: {
  quizId: string;
  questionId: string;
}): Promise<{
  type: QuestionType;
  stem: string;
  explanation: string | null;
  options: Array<{
    id: string;
    text: string;
    position: number;
    isCorrect: boolean;
  }>;
} | null> {
  const questionRes = await query<HighlightQuestionRow>(
    `SELECT qn.type, qn.stem, qn.explanation
     FROM quiz_questions qq
     JOIN questions qn ON qn.id = qq.question_id
     WHERE qq.quiz_id = $1
       AND qq.question_id = $2`,
    [input.quizId, input.questionId],
  );
  const questionRow = questionRes.rows[0];
  if (!questionRow) return null;

  const optionsRes = await query<HighlightOptionRow>(
    `SELECT id, text, is_correct, position
     FROM question_options
     WHERE question_id = $1
     ORDER BY position ASC, id ASC`,
    [input.questionId],
  );
  const options = optionsRes.rows.map((opt) => ({
    id: opt.id,
    text: opt.text,
    position: opt.position,
    isCorrect: opt.is_correct,
  }));

  return {
    type: questionRow.type,
    stem: questionRow.stem,
    explanation: questionRow.explanation,
    options,
  };
}

type SubmissionRow = {
  selected_option_ids: string[];
  is_correct: boolean;
  created_at: string;
};

export async function createOrGetHighlightSubmission(input: {
  userId: string;
  quizId: string;
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
}): Promise<{
  selectedOptionIds: string[];
  isCorrect: boolean;
  createdAt: string;
} | null> {
  return withTransaction(async (client) => {
    const insertRes = await client.query<SubmissionRow>(
      `INSERT INTO dashboard_highlight_challenge_submissions (
         user_id,
         quiz_id,
         question_id,
         selected_option_ids,
         is_correct
       ) VALUES ($1, $2, $3, $4::uuid[], $5)
       ON CONFLICT (user_id, quiz_id, question_id)
       DO NOTHING
       RETURNING selected_option_ids, is_correct, created_at`,
      [
        input.userId,
        input.quizId,
        input.questionId,
        input.selectedOptionIds,
        input.isCorrect,
      ],
    );

    const inserted = insertRes.rows[0];
    if (inserted) {
      return {
        selectedOptionIds: inserted.selected_option_ids.filter(
          (id): id is string => typeof id === "string",
        ),
        isCorrect: inserted.is_correct,
        createdAt: inserted.created_at,
      };
    }

    const existingRes = await client.query<SubmissionRow>(
      `SELECT selected_option_ids, is_correct, created_at
       FROM dashboard_highlight_challenge_submissions
       WHERE user_id = $1
         AND quiz_id = $2
         AND question_id = $3`,
      [input.userId, input.quizId, input.questionId],
    );
    const existing = existingRes.rows[0];
    if (!existing) return null;
    return {
      selectedOptionIds: existing.selected_option_ids.filter(
        (id): id is string => typeof id === "string",
      ),
      isCorrect: existing.is_correct,
      createdAt: existing.created_at,
    };
  });
}
