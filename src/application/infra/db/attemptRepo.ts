import type { PoolClient } from "pg";
import { query, withTransaction } from "@/application/infra/db/pool";
import {
  insertXpEvent,
  type XpEventInput,
} from "@/application/infra/db/xpRepo";
import type {
  Attempt,
  AttemptAnswer,
  AttemptQuestion,
  AttemptQuestionOption,
  AttemptStateResponse,
  AttemptStatus,
} from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/enums";

export type AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  challenge_id: string | null;
  custom_quiz_id: string | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number | null;
  remaining_seconds: number | null;
  score_raw: number;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  irt_estimate: number | null;
  xp_earned: number;
  created_at: string;
};

type AttemptAnswerRow = {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
  answered_at: string | null;
  is_correct: boolean | null;
  awarded_score: number | null;
};

type AttemptQuestionRow = {
  question_id: string;
  stem: string;
  type: QuestionType;
  default_score: number;
  position: number;
  score: number | null;
  passage_id: string | null;
  passage_content: string | null;
  passage_media_urls: string[] | null;
  passage_position: number | null;
};

type AttemptOptionRow = {
  id: string;
  question_id: string;
  label: string | null;
  text: string;
  position: number;
};

type QuizAttemptMetaRow = {
  id: string;
  is_challenge: boolean;
  estimated_time_seconds: number | null;
  challenge_time_limit_seconds: number | null;
  total_questions: number;
};

export type QuizAttemptMeta = {
  quizId: string;
  isChallenge: boolean;
  estimatedTimeSeconds: number | null;
  challengeTimeLimitSeconds: number | null;
  totalQuestions: number;
};

export type QuizQuestionMeta = {
  questionId: string;
  type: QuestionType;
};

export type QuizQuestionGrading = {
  questionId: string;
  type: QuestionType;
  defaultScore: number;
  score: number | null;
  position: number;
  optionIds: string[];
  correctOptionIds: string[];
  shortAnswerKeys: Array<{ acceptableAnswer: string; caseSensitive: boolean }>;
};

export type AttemptAnswerInput = {
  questionId: string;
  selectedOptionIds: string[] | null;
  textAnswer: string | null;
};

export type GradedAnswerInput = {
  questionId: string;
  selectedOptionIds: string[] | null;
  textAnswer: string | null;
  isCorrect: boolean;
  awardedScore: number;
};

export type AttemptStateResult = AttemptStateResponse;

type SubmitAttemptInput = {
  attemptId: string;
  gradedAnswers: GradedAnswerInput[];
  scoreRaw: number;
  scorePercent: number;
  correctCount: number;
  remainingSeconds: number | null;
  xpEvent: XpEventInput;
};

export type SubmitAttemptResult =
  | { status: "ok"; attempt: Attempt }
  | { status: "not_found" }
  | { status: "already_submitted"; attempt: Attempt };

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    timeLimitSeconds: row.time_limit_seconds,
    remainingSeconds: row.remaining_seconds,
    scoreRaw: Number(row.score_raw),
    scorePercent: Number(row.score_percent),
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    xpEarned: row.xp_earned,
  };
}

function mapAttemptAnswer(row: AttemptAnswerRow): AttemptAnswer {
  return {
    questionId: row.question_id,
    selectedOptionIds: row.selected_option_ids ?? null,
    textAnswer: row.text_answer,
    answeredAt: row.answered_at,
    isCorrect: row.is_correct ?? undefined,
    awardedScore:
      row.awarded_score !== null && row.awarded_score !== undefined
        ? Number(row.awarded_score)
        : undefined,
  };
}

function mapAttemptQuestion(
  row: AttemptQuestionRow,
  options: AttemptQuestionOption[],
): AttemptQuestion {
  return {
    id: row.question_id,
    stem: row.stem,
    type: row.type,
    position: row.position,
    score: row.score !== null ? Number(row.score) : null,
    defaultScore: Number(row.default_score),
    passage: row.passage_id
      ? {
          id: row.passage_id,
          content: row.passage_content ?? "",
          mediaUrls: row.passage_media_urls ?? [],
          position: row.passage_position ?? 1,
        }
      : null,
    options,
  };
}

export async function getQuizAttemptMeta(
  quizId: string,
): Promise<QuizAttemptMeta | null> {
  const res = await query<QuizAttemptMetaRow>(
    `SELECT q.id,
            q.is_challenge,
            q.estimated_time_seconds,
            cs.time_limit_seconds AS challenge_time_limit_seconds,
            (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions
     FROM quizzes q
     LEFT JOIN challenge_settings cs ON cs.quiz_id = q.id
     WHERE q.id = $1
       AND q.status = 'published'`,
    [quizId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    quizId: row.id,
    isChallenge: row.is_challenge,
    estimatedTimeSeconds: row.estimated_time_seconds,
    challengeTimeLimitSeconds: row.challenge_time_limit_seconds,
    totalQuestions: Number(row.total_questions),
  };
}

export async function findInProgressAttempt(
  userId: string,
  quizId: string,
): Promise<AttemptRow | null> {
  const res = await query<AttemptRow>(
    `SELECT * FROM attempts
     WHERE user_id = $1 AND quiz_id = $2 AND status = 'in_progress'
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId, quizId],
  );
  return res.rows[0] ?? null;
}

export async function findChallengeAttempt(
  userId: string,
  challengeQuizId: string,
): Promise<AttemptRow | null> {
  const res = await query<AttemptRow>(
    `SELECT * FROM attempts
     WHERE user_id = $1 AND challenge_id = $2
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId, challengeQuizId],
  );
  return res.rows[0] ?? null;
}

export async function createAttempt(input: {
  userId: string;
  quizId: string;
  challengeId: string | null;
  timeLimitSeconds: number | null;
  remainingSeconds: number | null;
  totalQuestions: number;
}): Promise<AttemptRow> {
  const params = [
    input.userId,
    input.quizId,
    input.challengeId,
    input.timeLimitSeconds,
    input.remainingSeconds,
    input.totalQuestions,
  ];

  const insertSql = `INSERT INTO attempts (
       user_id,
       quiz_id,
       challenge_id,
       time_limit_seconds,
       remaining_seconds,
       total_questions
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;

  if (!input.challengeId) {
    const res = await query<AttemptRow>(insertSql, params);
    const row = res.rows[0];
    if (!row) throw new Error("Failed to create attempt");
    return row;
  }

  try {
    const res = await query<AttemptRow>(insertSql, params);
    const row = res.rows[0];
    if (row) return row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const res = await query<AttemptRow>(
        `SELECT * FROM attempts
         WHERE user_id = $1 AND challenge_id = $2
         ORDER BY started_at DESC
         LIMIT 1`,
        [input.userId, input.challengeId],
      );
      const row = res.rows[0];
      if (row) return row;
    }
    throw error;
  }

  throw new Error("Failed to create attempt");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function getAttemptById(
  attemptId: string,
): Promise<AttemptRow | null> {
  const res = await query<AttemptRow>(`SELECT * FROM attempts WHERE id = $1`, [
    attemptId,
  ]);
  return res.rows[0] ?? null;
}

export async function getAttemptState(
  attemptId: string,
): Promise<AttemptStateResult | null> {
  const res = await query<AttemptRow>(`SELECT * FROM attempts WHERE id = $1`, [
    attemptId,
  ]);
  const attemptRow = res.rows[0];
  if (!attemptRow) return null;
  const [questions, answers] = await Promise.all([
    listAttemptQuestions(attemptRow.quiz_id),
    listAttemptAnswers(attemptId),
  ]);
  return {
    attempt: mapAttempt(attemptRow),
    ownerId: attemptRow.user_id,
    quizId: attemptRow.quiz_id,
    questions,
    answers,
  };
}

export async function listAttemptAnswers(
  attemptId: string,
): Promise<AttemptAnswer[]> {
  const res = await query<AttemptAnswerRow>(
    `SELECT question_id,
            selected_option_ids,
            text_answer,
            answered_at,
            is_correct,
            awarded_score
     FROM attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  );
  return res.rows.map(mapAttemptAnswer);
}

export async function listAttemptQuestions(
  quizId: string,
): Promise<AttemptQuestion[]> {
  const questionRes = await query<AttemptQuestionRow>(
    `SELECT qq.question_id,
            qq.position,
            qq.score,
            q.stem,
            q.type,
            q.default_score,
            qp.passage_id,
            qp.position AS passage_position,
            p.content AS passage_content,
            p.media_urls AS passage_media_urls
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     LEFT JOIN question_passages qp ON qp.question_id = q.id
     LEFT JOIN passages p ON p.id = qp.passage_id
     WHERE qq.quiz_id = $1
     ORDER BY qq.position ASC`,
    [quizId],
  );

  const questionIds = questionRes.rows.map((row) => row.question_id);
  const optionRes = questionIds.length
    ? await query<AttemptOptionRow>(
        `SELECT id, question_id, label, text, position
         FROM question_options
         WHERE question_id = ANY($1)
         ORDER BY question_id, position`,
        [questionIds],
      )
    : { rows: [] as AttemptOptionRow[] };

  const optionsByQuestion = new Map<string, AttemptQuestionOption[]>();
  optionRes.rows.forEach((row) => {
    const list = optionsByQuestion.get(row.question_id) ?? [];
    list.push({
      id: row.id,
      label: row.label,
      text: row.text,
      position: row.position,
    });
    optionsByQuestion.set(row.question_id, list);
  });

  return questionRes.rows.map((row) =>
    mapAttemptQuestion(row, optionsByQuestion.get(row.question_id) ?? []),
  );
}

export async function listQuizQuestionMeta(
  quizId: string,
): Promise<QuizQuestionMeta[]> {
  const res = await query<{ question_id: string; type: QuestionType }>(
    `SELECT qq.question_id, q.type
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     WHERE qq.quiz_id = $1`,
    [quizId],
  );
  return res.rows.map((row) => ({
    questionId: row.question_id,
    type: row.type,
  }));
}

export async function listQuizGradingData(
  quizId: string,
): Promise<QuizQuestionGrading[]> {
  const baseRes = await query<{
    question_id: string;
    type: QuestionType;
    default_score: number;
    score: number | null;
    position: number;
  }>(
    `SELECT qq.question_id,
            qq.position,
            qq.score,
            q.type,
            q.default_score
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     WHERE qq.quiz_id = $1
     ORDER BY qq.position ASC`,
    [quizId],
  );

  const questionIds = baseRes.rows.map((row) => row.question_id);
  const optionRes = questionIds.length
    ? await query<{ id: string; question_id: string; is_correct: boolean }>(
        `SELECT id, question_id, is_correct
         FROM question_options
         WHERE question_id = ANY($1)`,
        [questionIds],
      )
    : {
        rows: [] as Array<{
          id: string;
          question_id: string;
          is_correct: boolean;
        }>,
      };

  const shortAnswerRes = questionIds.length
    ? await query<{
        question_id: string;
        acceptable_answer: string;
        case_sensitive: boolean;
      }>(
        `SELECT question_id, acceptable_answer, case_sensitive
         FROM short_answer_keys
         WHERE question_id = ANY($1)`,
        [questionIds],
      )
    : {
        rows: [] as Array<{
          question_id: string;
          acceptable_answer: string;
          case_sensitive: boolean;
        }>,
      };

  const optionGroups = new Map<
    string,
    Array<{ id: string; isCorrect: boolean }>
  >();
  optionRes.rows.forEach((row) => {
    const list = optionGroups.get(row.question_id) ?? [];
    list.push({ id: row.id, isCorrect: row.is_correct });
    optionGroups.set(row.question_id, list);
  });

  const shortAnswerGroups = new Map<
    string,
    Array<{ acceptableAnswer: string; caseSensitive: boolean }>
  >();
  shortAnswerRes.rows.forEach((row) => {
    const list = shortAnswerGroups.get(row.question_id) ?? [];
    list.push({
      acceptableAnswer: row.acceptable_answer,
      caseSensitive: row.case_sensitive,
    });
    shortAnswerGroups.set(row.question_id, list);
  });

  return baseRes.rows.map((row) => {
    const options = optionGroups.get(row.question_id) ?? [];
    return {
      questionId: row.question_id,
      type: row.type,
      defaultScore: Number(row.default_score),
      score: row.score !== null ? Number(row.score) : null,
      position: row.position,
      optionIds: options.map((opt) => opt.id),
      correctOptionIds: options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id),
      shortAnswerKeys: shortAnswerGroups.get(row.question_id) ?? [],
    };
  });
}

export async function saveAttemptAnswers(input: {
  attemptId: string;
  answers: AttemptAnswerInput[];
  remainingSeconds?: number | null;
}) {
  if (!input.answers.length && input.remainingSeconds === undefined) return;
  await withTransaction(async (client) => {
    if (input.remainingSeconds !== undefined) {
      await client.query(
        `UPDATE attempts SET remaining_seconds = $2 WHERE id = $1`,
        [input.attemptId, input.remainingSeconds],
      );
    }
    if (input.answers.length) {
      await upsertAutosaveAnswers(client, input.attemptId, input.answers);
      await insertAnswerEvents(
        client,
        input.attemptId,
        input.answers,
        "autosave",
        {
          remainingSeconds: input.remainingSeconds ?? null,
        },
      );
    }
  });
}

export async function submitAttempt(
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  return withTransaction(async (client) => {
    const attemptRes = await client.query<AttemptRow>(
      `SELECT * FROM attempts WHERE id = $1 FOR UPDATE`,
      [input.attemptId],
    );
    const attemptRow = attemptRes.rows[0];
    if (!attemptRow) return { status: "not_found" };
    if (attemptRow.status !== "in_progress") {
      return { status: "already_submitted", attempt: mapAttempt(attemptRow) };
    }

    await upsertGradedAnswers(client, input.attemptId, input.gradedAnswers);
    await insertAnswerEvents(
      client,
      input.attemptId,
      input.gradedAnswers,
      "submit",
    );

    const updatedRes = await client.query<AttemptRow>(
      `UPDATE attempts
       SET status = 'submitted',
           submitted_at = now(),
           remaining_seconds = $2,
           score_raw = $3,
           score_percent = $4,
           correct_count = $5,
           xp_earned = $6
       WHERE id = $1
       RETURNING *`,
      [
        input.attemptId,
        input.remainingSeconds,
        input.scoreRaw,
        input.scorePercent,
        input.correctCount,
        input.xpEvent.amount,
      ],
    );

    await insertXpEvent(input.xpEvent, client);

    const updated = updatedRes.rows[0];
    if (!updated) throw new Error("Failed to submit attempt");
    return { status: "ok", attempt: mapAttempt(updated) };
  });
}

async function upsertAutosaveAnswers(
  client: PoolClient,
  attemptId: string,
  answers: AttemptAnswerInput[],
) {
  const values: string[] = [];
  const params: unknown[] = [attemptId];
  answers.forEach((answer, index) => {
    const base = index * 3;
    values.push(
      `($1, $${base + 2}, $${base + 3}::uuid[], $${base + 4}, now(), true)`,
    );
    params.push(answer.questionId, answer.selectedOptionIds, answer.textAnswer);
  });

  await client.query(
    `INSERT INTO attempt_answers (
       attempt_id,
       question_id,
       selected_option_ids,
       text_answer,
       answered_at,
       auto_saved
     ) VALUES ${values.join(", ")}
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET
       selected_option_ids = EXCLUDED.selected_option_ids,
       text_answer = EXCLUDED.text_answer,
       answered_at = EXCLUDED.answered_at,
       auto_saved = TRUE`,
    params,
  );
}

async function upsertGradedAnswers(
  client: PoolClient,
  attemptId: string,
  answers: GradedAnswerInput[],
) {
  if (!answers.length) return;
  const values: string[] = [];
  const params: unknown[] = [attemptId];
  answers.forEach((answer, index) => {
    const base = index * 5;
    values.push(
      `($1, $${base + 2}, $${base + 3}::uuid[], $${base + 4}, $${base + 5}, $${base + 6}, now(), false)`,
    );
    params.push(
      answer.questionId,
      answer.selectedOptionIds,
      answer.textAnswer,
      answer.isCorrect,
      answer.awardedScore,
    );
  });

  await client.query(
    `INSERT INTO attempt_answers (
       attempt_id,
       question_id,
       selected_option_ids,
       text_answer,
       is_correct,
       awarded_score,
       answered_at,
       auto_saved
     ) VALUES ${values.join(", ")}
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET
       selected_option_ids = EXCLUDED.selected_option_ids,
       text_answer = EXCLUDED.text_answer,
       is_correct = EXCLUDED.is_correct,
       awarded_score = EXCLUDED.awarded_score,
       answered_at = EXCLUDED.answered_at,
       auto_saved = FALSE`,
    params,
  );
}

async function insertAnswerEvents(
  client: PoolClient,
  attemptId: string,
  answers: Array<AttemptAnswerInput | GradedAnswerInput>,
  eventType: "autosave" | "submit",
  meta?: Record<string, unknown>,
) {
  if (!answers.length) return;
  const values: string[] = [];
  const params: unknown[] = [attemptId];
  answers.forEach((answer, index) => {
    const base = index * 3;
    values.push(`($1, $${base + 2}, $${base + 3}::jsonb, $${base + 4})`);
    const payload = {
      selectedOptionIds: answer.selectedOptionIds ?? null,
      textAnswer: answer.textAnswer ?? null,
      ...(meta ?? {}),
    };
    if (isGradedAnswer(answer)) {
      Object.assign(payload, {
        isCorrect: answer.isCorrect,
        awardedScore: answer.awardedScore,
      });
    }
    params.push(answer.questionId, payload, eventType);
  });

  await client.query(
    `INSERT INTO attempt_answer_events (
       attempt_id,
       question_id,
       payload,
       event_type
      ) VALUES ${values.join(", ")}`,
    params,
  );
}

function isGradedAnswer(
  answer: AttemptAnswerInput | GradedAnswerInput,
): answer is GradedAnswerInput {
  return (
    typeof (answer as GradedAnswerInput).isCorrect === "boolean" &&
    typeof (answer as GradedAnswerInput).awardedScore === "number"
  );
}
