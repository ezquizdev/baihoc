import type { PoolClient, QueryResultRow } from "pg";
import {
  applyQuestionIrtStatsDelta,
  getOrCreateUserQuizFirstAttempt,
} from "@/application/infra/db/irtRepo";
import { query, withTransaction } from "@/application/infra/db/pool";
import {
  insertXpEvent,
  type XpEventInput,
} from "@/application/infra/db/xpRepo";
import type {
  ActiveAttemptSummary,
  Attempt,
  AttemptAnswer,
  AttemptHistoryItem,
  AttemptHistoryKind,
  AttemptQuestion,
  AttemptQuestionOption,
  AttemptReviewQuestion,
  AttemptStateResponse,
  AttemptStatus,
  AttemptSubjectScore,
} from "@/application/models/attempt";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";

function runQuery<T extends QueryResultRow>(
  client: PoolClient | undefined,
  text: string,
  params?: unknown[],
) {
  return client ? client.query<T>(text, params) : query<T>(text, params);
}

export type AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  challenge_id: string | null;
  custom_quiz_id: string | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  judged_at: string | null;
  judgement_version: number;
  quiz_content_hash_snapshot: string | null;
  snapshot_quiz_title: string | null;
  snapshot_quiz_difficulty_level: number | null;
  snapshot_quiz_estimated_time_seconds: number | null;
  snapshot_quiz_is_challenge: boolean | null;
  snapshot_subject_scores: unknown | null;
  snapshot_subject_scores_estimated: boolean;
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

export type InProgressAttemptRow = Pick<
  AttemptRow,
  | "id"
  | "quiz_id"
  | "challenge_id"
  | "status"
  | "started_at"
  | "time_limit_seconds"
  | "remaining_seconds"
> & { challenge_end_at: string | null };

type AttemptAnswerRow = {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
  answered_at: string | null;
  is_correct: boolean | null;
  awarded_score: number | null;
  awarded_irt_score: number | null;
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

type AttemptReviewMetaRow = AttemptRow & {
  quiz_title: string | null;
  quiz_exists: boolean;
};

type AttemptReviewQuestionRow = {
  question_id: string;
  position: number;
  question_type: QuestionType;
  question_exists: boolean;
  stem: string | null;
  explanation: string | null;
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

type AttemptReviewOptionRow = AttemptOptionRow & {
  is_correct: boolean;
};

type AttemptReviewShortAnswerKeyRow = {
  id: string;
  question_id: string;
  acceptable_answer: string;
  case_sensitive: boolean;
};

type QuizAttemptMetaRow = {
  id: string;
  is_challenge: boolean;
  estimated_time_seconds: number | null;
  challenge_time_limit_seconds: number | null;
  challenge_start_at: string | null;
  challenge_end_at: string | null;
  custom_quiz_id: string | null;
  custom_quiz_owner_id: string | null;
  total_questions: number;
};

type QuizSnapshotMetaRow = {
  title: string | null;
  difficulty_level: number;
  estimated_time_seconds: number | null;
  is_challenge: boolean;
};

export type QuizAttemptMeta = {
  quizId: string;
  isChallenge: boolean;
  estimatedTimeSeconds: number | null;
  challengeTimeLimitSeconds: number | null;
  challengeStartAt: string | null;
  challengeEndAt: string | null;
  customQuizId: string | null;
  customQuizOwnerId: string | null;
  totalQuestions: number;
};

export type QuizSnapshotMeta = {
  title: string | null;
  difficultyLevel: DifficultyLevel;
  estimatedTimeSeconds: number | null;
  isChallenge: boolean;
};

type AttemptHistoryRow = {
  id: string;
  quiz_id: string;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
  is_challenge: boolean;
  quiz_title: string | null;
  quiz_difficulty_level: number | null;
  quiz_estimated_time_seconds: number | null;
  subject_scores_estimated: boolean;
  subject_scores: Array<{
    subjectId: string;
    name: string;
    slug: string;
    correctCount: number;
    totalQuestions: number;
    irtScore?: number;
    scorePercent: number;
  }> | null;
  custom_quiz_id: string | null;
  custom_config: unknown | null;
};

type ActiveAttemptSummaryRow = {
  id: string;
  quiz_id: string;
  challenge_id: string | null;
  custom_quiz_id: string | null;
  started_at: string;
  time_limit_seconds: number | null;
  remaining_seconds: number | null;
  quiz_title: string | null;
  quiz_difficulty_level: number | null;
  quiz_estimated_time_seconds: number | null;
  quiz_is_challenge: boolean | null;
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
  required: boolean;
  position: number;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  questionUpdatedAt: string;
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
  awardedIrtScore: number;
};

export type AttemptStateResult = AttemptStateResponse;

type SubmitAttemptInput = {
  attemptId: string;
  gradedAnswers: GradedAnswerInput[];
  scoreRaw: number;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  remainingSeconds: number | null;
  xpEvent: XpEventInput;
  snapshot: {
    quizContentHash: string;
    quizTitle: string | null;
    quizDifficultyLevel: DifficultyLevel | null;
    quizEstimatedTimeSeconds: number | null;
    isChallenge: boolean | null;
    subjectScores: AttemptSubjectScore[];
    subjectScoresEstimated: boolean;
  };
  questionSnapshots: Array<{
    questionId: string;
    questionType: QuestionType;
    position: number;
    maxScore: number;
    required: boolean;
    subjectId: string;
    subjectName: string;
    subjectSlug: string;
    questionUpdatedAt: string;
  }>;
};

export type SubmitAttemptResult =
  | { status: "ok"; attempt: Attempt }
  | { status: "not_found" }
  | { status: "already_submitted"; attempt: Attempt };

type RejudgeAttemptInput = {
  attemptId: string;
  expectedJudgementVersion: number;
  gradedAnswers: Array<
    Pick<
      GradedAnswerInput,
      "questionId" | "isCorrect" | "awardedScore" | "awardedIrtScore"
    >
  >;
  scoreRaw: number;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  xpAdjustmentEvent?: XpEventInput | null;
  snapshot: SubmitAttemptInput["snapshot"];
  questionSnapshots: SubmitAttemptInput["questionSnapshots"];
};

export type RejudgeAttemptResult =
  | { status: "ok"; attempt: Attempt; judgementVersion: number }
  | { status: "not_found" }
  | { status: "not_submitted" }
  | { status: "conflict" };

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
    awardedIrtScore:
      row.awarded_irt_score !== null && row.awarded_irt_score !== undefined
        ? Number(row.awarded_irt_score)
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
  client?: PoolClient,
): Promise<QuizAttemptMeta | null> {
  const res = await runQuery<QuizAttemptMetaRow>(
    client,
    `SELECT q.id,
            q.is_challenge,
            q.estimated_time_seconds,
            cs.time_limit_seconds AS challenge_time_limit_seconds,
            cs.start_at AS challenge_start_at,
            cs.end_at AS challenge_end_at,
            cq.id AS custom_quiz_id,
            cq.user_id AS custom_quiz_owner_id,
            (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions
     FROM quizzes q
     LEFT JOIN challenge_settings cs ON cs.quiz_id = q.id
     LEFT JOIN LATERAL (
       SELECT id, user_id
       FROM custom_quizzes
       WHERE generated_quiz_id = q.id
         AND status = 'ready'::custom_quiz_status
       ORDER BY created_at DESC
       LIMIT 1
     ) cq ON true
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
    challengeStartAt: row.challenge_start_at,
    challengeEndAt: row.challenge_end_at,
    customQuizId: row.custom_quiz_id,
    customQuizOwnerId: row.custom_quiz_owner_id,
    totalQuestions: Number(row.total_questions),
  };
}

export async function lockAttemptStartForUser(
  client: PoolClient,
  userId: string,
) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [userId]);
}

export async function listInProgressAttemptsForUser(
  userId: string,
  client?: PoolClient,
): Promise<InProgressAttemptRow[]> {
  const res = await runQuery<InProgressAttemptRow>(
    client,
    `SELECT a.id,
            a.quiz_id,
            a.challenge_id,
            a.status,
            a.started_at,
            a.time_limit_seconds,
            a.remaining_seconds,
            cs.end_at AS challenge_end_at
     FROM attempts a
     LEFT JOIN challenge_settings cs ON cs.quiz_id = a.challenge_id
     WHERE a.user_id = $1
       AND a.status = 'in_progress'
     ORDER BY a.started_at DESC, a.id DESC`,
    [userId],
  );
  return res.rows;
}

export async function getQuizSnapshotMeta(
  quizId: string,
  client?: PoolClient,
): Promise<QuizSnapshotMeta | null> {
  const res = await runQuery<QuizSnapshotMetaRow>(
    client,
    `SELECT title, difficulty_level, estimated_time_seconds, is_challenge
     FROM quizzes
     WHERE id = $1`,
    [quizId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    title: row.title ?? null,
    difficultyLevel: row.difficulty_level as DifficultyLevel,
    estimatedTimeSeconds: row.estimated_time_seconds,
    isChallenge: row.is_challenge,
  };
}

export async function findInProgressAttempt(
  userId: string,
  quizId: string,
  client?: PoolClient,
): Promise<AttemptRow | null> {
  const res = await runQuery<AttemptRow>(
    client,
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
  client?: PoolClient,
): Promise<AttemptRow | null> {
  const res = await runQuery<AttemptRow>(
    client,
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
  customQuizId: string | null;
  timeLimitSeconds: number | null;
  remainingSeconds: number | null;
  totalQuestions: number;
}): Promise<AttemptRow> {
  return createAttemptWithClient(undefined, input);
}

export async function createAttemptWithClient(
  client: PoolClient | undefined,
  input: {
    userId: string;
    quizId: string;
    challengeId: string | null;
    customQuizId: string | null;
    timeLimitSeconds: number | null;
    remainingSeconds: number | null;
    totalQuestions: number;
  },
): Promise<AttemptRow> {
  const params = [
    input.userId,
    input.quizId,
    input.challengeId,
    input.customQuizId,
    input.timeLimitSeconds,
    input.remainingSeconds,
    input.totalQuestions,
  ];

  const insertSql = `INSERT INTO attempts (
       user_id,
       quiz_id,
       challenge_id,
       custom_quiz_id,
       time_limit_seconds,
       remaining_seconds,
       total_questions
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;

  if (!input.challengeId) {
    const res = await runQuery<AttemptRow>(client, insertSql, params);
    const row = res.rows[0];
    if (!row) throw new Error("Failed to create attempt");
    return row;
  }

  try {
    const res = await runQuery<AttemptRow>(client, insertSql, params);
    const row = res.rows[0];
    if (row) return row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const res = await runQuery<AttemptRow>(
        client,
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
  client?: PoolClient,
): Promise<AttemptRow | null> {
  const res = await runQuery<AttemptRow>(
    client,
    `SELECT * FROM attempts WHERE id = $1`,
    [attemptId],
  );
  return res.rows[0] ?? null;
}

export async function getAttemptState(
  attemptId: string,
): Promise<AttemptStateResult | null> {
  const res = await query<
    AttemptRow & { quiz_title: string | null | undefined }
  >(
    `SELECT a.*, q.title AS quiz_title
     FROM attempts a
     LEFT JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.id = $1`,
    [attemptId],
  );
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
    quizTitle: attemptRow.quiz_title ?? null,
    questions,
    answers,
  };
}

export async function getActiveAttemptSummary(
  userId: string,
  client?: PoolClient,
): Promise<ActiveAttemptSummary | null> {
  const res = await runQuery<ActiveAttemptSummaryRow>(
    client,
    `SELECT a.id,
            a.quiz_id,
            a.challenge_id,
            a.custom_quiz_id,
            a.started_at,
            a.time_limit_seconds,
            a.remaining_seconds,
            q.title AS quiz_title,
            q.difficulty_level AS quiz_difficulty_level,
            q.estimated_time_seconds AS quiz_estimated_time_seconds,
            q.is_challenge AS quiz_is_challenge
     FROM attempts a
     LEFT JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.user_id = $1
       AND a.status = 'in_progress'
     ORDER BY a.started_at DESC, a.id DESC
     LIMIT 1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    attemptId: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title ?? null,
    quizDifficulty: clampDifficulty(row.quiz_difficulty_level),
    quizEstimatedTimeSeconds: row.quiz_estimated_time_seconds ?? null,
    isChallenge: Boolean(row.challenge_id ?? row.quiz_is_challenge),
    customQuizId: row.custom_quiz_id,
    startedAt: row.started_at,
    timeLimitSeconds: row.time_limit_seconds,
    remainingSeconds: row.remaining_seconds,
  };
}

export async function getAttemptReviewMeta(attemptId: string): Promise<{
  attemptRow: AttemptRow;
  quizTitle: string | null;
  quizExists: boolean;
} | null> {
  const res = await query<AttemptReviewMetaRow>(
    `SELECT a.*,
            q.title AS quiz_title,
            (q.id IS NOT NULL) AS quiz_exists
     FROM attempts a
     LEFT JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.id = $1`,
    [attemptId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    attemptRow: row,
    quizTitle: row.snapshot_quiz_title ?? row.quiz_title ?? null,
    quizExists: row.quiz_exists,
  };
}

export async function listAttemptHistory(params: {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
  kind?: AttemptHistoryKind;
}): Promise<{
  items: Array<Omit<AttemptHistoryItem, "quizExists" | "canRedo">>;
  total: number;
}> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const where: string[] = [
    "a.user_id = $1",
    "a.status IN ('submitted', 'auto_submitted')",
  ];
  const values: unknown[] = [params.userId];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  const search = params.search?.trim();
  if (search) {
    add("COALESCE(a.snapshot_quiz_title, '') ILIKE $idx", `%${search}%`);
  }

  if (params.kind === "challenge") {
    where.push("a.challenge_id IS NOT NULL");
  } else if (params.kind === "custom") {
    where.push("a.custom_quiz_id IS NOT NULL");
  } else if (params.kind === "practice") {
    where.push("a.challenge_id IS NULL");
    where.push("a.custom_quiz_id IS NULL");
  }

  const countRes = await query<{ cnt: string }>(
    `SELECT COUNT(*)::int AS cnt
     FROM attempts a
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
    values,
  );
  const total = Number(countRes.rows[0]?.cnt ?? 0);

  const pageValues = [...values, limit, offset];

  const res = await query<AttemptHistoryRow>(
    `SELECT a.id,
            a.quiz_id,
            a.status,
            a.started_at,
            a.submitted_at,
            a.score_percent,
            a.correct_count,
            a.total_questions,
            a.xp_earned,
            (a.challenge_id IS NOT NULL) AS is_challenge,
            a.snapshot_quiz_title AS quiz_title,
            a.snapshot_quiz_difficulty_level AS quiz_difficulty_level,
            a.snapshot_quiz_estimated_time_seconds AS quiz_estimated_time_seconds,
            CASE
              WHEN a.snapshot_subject_scores IS NOT NULL
              THEN a.snapshot_subject_scores_estimated
              ELSE true
            END AS subject_scores_estimated,
            COALESCE(a.snapshot_subject_scores, '[]'::jsonb) AS subject_scores,
            a.custom_quiz_id,
            cq.config AS custom_config
     FROM attempts a
     LEFT JOIN custom_quizzes cq ON cq.id = a.custom_quiz_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY a.started_at DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );

  const items = res.rows.map(mapAttemptHistoryRow);
  return { items, total };
}

export async function backfillAttemptSnapshotsForQuiz(
  quizId: string,
): Promise<void> {
  await query(
    `UPDATE attempts a
     SET snapshot_quiz_title = COALESCE(a.snapshot_quiz_title, q.title),
         snapshot_quiz_difficulty_level = COALESCE(a.snapshot_quiz_difficulty_level, q.difficulty_level),
         snapshot_quiz_estimated_time_seconds = COALESCE(a.snapshot_quiz_estimated_time_seconds, q.estimated_time_seconds),
         snapshot_quiz_is_challenge = COALESCE(a.snapshot_quiz_is_challenge, q.is_challenge),
         snapshot_subject_scores = CASE
           WHEN a.snapshot_subject_scores IS NOT NULL THEN a.snapshot_subject_scores
           ELSE COALESCE(
             (
               SELECT jsonb_agg(
                 jsonb_build_object(
                   'subjectId', subj.id,
                   'name', subj.name,
                   'slug', subj.slug,
                   'totalQuestions', qb.question_count,
                   'correctCount', qb.correct_count,
                   'scorePercent', qb.score_percent
                 )
                 ORDER BY qb.score_percent DESC, qb.question_count DESC, subj.name
               )
               FROM (
                 SELECT qn.subject_id,
                        COUNT(*)::int AS question_count,
                        CASE
                          WHEN MAX(CASE WHEN aa.attempt_id IS NOT NULL THEN 1 ELSE 0 END) = 1
                          THEN COALESCE(
                            SUM(CASE WHEN aa.is_correct IS TRUE THEN 1 ELSE 0 END),
                            0
                          )::int
                          WHEN COALESCE(a.total_questions, 0) <= 0
                          THEN 0
                          ELSE ROUND(
                            COUNT(*)::numeric
                            * COALESCE(a.correct_count, 0)::numeric
                            / NULLIF(a.total_questions, 0)::numeric
                          )::int
                        END AS correct_count,
                        CASE
                          WHEN MAX(CASE WHEN aa.attempt_id IS NOT NULL THEN 1 ELSE 0 END) = 1
                          THEN CASE
                            WHEN COALESCE(
                              SUM(COALESCE(qq.score, qn.default_score)),
                              0
                            )::numeric <= 0
                            THEN 0
                            ELSE ROUND(
                              COALESCE(SUM(aa.awarded_score), 0)::numeric
                              / COALESCE(
                                SUM(COALESCE(qq.score, qn.default_score)),
                                0
                              )::numeric
                              * 100,
                              2
                            )
                          END
                          ELSE CASE
                            WHEN COUNT(*) <= 0 OR COALESCE(a.total_questions, 0) <= 0
                            THEN 0
                            ELSE ROUND(
                              ROUND(
                                COUNT(*)::numeric
                                * COALESCE(a.correct_count, 0)::numeric
                                / NULLIF(a.total_questions, 0)::numeric
                              )::numeric
                              / COUNT(*)::numeric
                              * 100,
                              2
                            )
                          END
                        END AS score_percent
                 FROM quiz_questions qq
                 JOIN questions qn ON qn.id = qq.question_id
                 LEFT JOIN attempt_answers aa
                   ON aa.attempt_id = a.id
                  AND aa.question_id = qq.question_id
                 WHERE qq.quiz_id = a.quiz_id
                 GROUP BY qn.subject_id
               ) qb
               JOIN subjects subj ON subj.id = qb.subject_id
             ),
             '[]'::jsonb
           )
         END,
         snapshot_subject_scores_estimated = CASE
           WHEN a.snapshot_subject_scores IS NOT NULL
           THEN a.snapshot_subject_scores_estimated
           ELSE NOT EXISTS (
             SELECT 1 FROM attempt_answers aa0 WHERE aa0.attempt_id = a.id
           )
         END
     FROM quizzes q
     WHERE a.quiz_id = q.id
       AND a.quiz_id = $1
       AND a.status IN ('submitted', 'auto_submitted')`,
    [quizId],
  );
}

export async function backfillAttemptQuestionSnapshotsForQuiz(
  quizId: string,
): Promise<void> {
  await query(
    `INSERT INTO attempt_question_snapshots (
       attempt_id,
       judgement_version,
       position,
       question_id,
       question_type,
       max_score,
       required,
       subject_id,
       subject_name,
       subject_slug,
       question_updated_at
     )
     SELECT a.id AS attempt_id,
            a.judgement_version,
            qq.position,
            qq.question_id,
            q.type AS question_type,
            COALESCE(qq.score, q.default_score) AS max_score,
            qq.required,
            subj.id AS subject_id,
            subj.name AS subject_name,
            subj.slug AS subject_slug,
            q.updated_at AS question_updated_at
     FROM attempts a
     JOIN quiz_questions qq ON qq.quiz_id = a.quiz_id
     JOIN questions q ON q.id = qq.question_id
     JOIN subjects subj ON subj.id = q.subject_id
     WHERE a.quiz_id = $1
       AND a.status IN ('submitted', 'auto_submitted')
     ON CONFLICT (attempt_id, judgement_version, question_id) DO NOTHING`,
    [quizId],
  );
}

export async function listAttemptAnswers(
  attemptId: string,
  client?: PoolClient,
): Promise<AttemptAnswer[]> {
  const res = await runQuery<AttemptAnswerRow>(
    client,
    `SELECT question_id,
            selected_option_ids,
            text_answer,
            answered_at,
            is_correct,
            awarded_score,
            awarded_irt_score
     FROM attempt_answers
     WHERE attempt_id = $1`,
    [attemptId],
  );
  return res.rows.map(mapAttemptAnswer);
}

export async function listAttemptSnapshotQuestionIds(
  attemptId: string,
  judgementVersion: number,
): Promise<string[]> {
  const res = await query<{ question_id: string }>(
    `SELECT question_id
     FROM attempt_question_snapshots
     WHERE attempt_id = $1
       AND judgement_version = $2
     ORDER BY position ASC`,
    [attemptId, judgementVersion],
  );
  return res.rows.map((row) => row.question_id);
}

export async function listAttemptReviewQuestions(
  attemptId: string,
  judgementVersion: number,
): Promise<AttemptReviewQuestion[]> {
  const questionRes = await query<AttemptReviewQuestionRow>(
    `SELECT qs.question_id,
            qs.position,
            qs.question_type,
            (q.id IS NOT NULL) AS question_exists,
            q.stem,
            q.explanation,
            qp.passage_id,
            qp.position AS passage_position,
            p.content AS passage_content,
            p.media_urls AS passage_media_urls
     FROM attempt_question_snapshots qs
     LEFT JOIN questions q ON q.id = qs.question_id
     LEFT JOIN question_passages qp ON qp.question_id = q.id
     LEFT JOIN passages p ON p.id = qp.passage_id
     WHERE qs.attempt_id = $1
       AND qs.judgement_version = $2
     ORDER BY qs.position ASC`,
    [attemptId, judgementVersion],
  );

  const questionIds = questionRes.rows.map((row) => row.question_id);
  const optionRes = questionIds.length
    ? await query<AttemptReviewOptionRow>(
        `SELECT id, question_id, label, text, position, is_correct
         FROM question_options
         WHERE question_id = ANY($1)
         ORDER BY question_id, position`,
        [questionIds],
      )
    : { rows: [] as AttemptReviewOptionRow[] };

  const optionsByQuestion = new Map<string, AttemptQuestionOption[]>();
  const correctOptionIdsByQuestion = new Map<string, string[]>();
  optionRes.rows.forEach((row) => {
    const list = optionsByQuestion.get(row.question_id) ?? [];
    list.push({
      id: row.id,
      label: row.label,
      text: row.text,
      position: row.position,
    });
    optionsByQuestion.set(row.question_id, list);

    if (row.is_correct) {
      const correctList = correctOptionIdsByQuestion.get(row.question_id) ?? [];
      correctList.push(row.id);
      correctOptionIdsByQuestion.set(row.question_id, correctList);
    }
  });

  const shortAnswerRes = questionIds.length
    ? await query<AttemptReviewShortAnswerKeyRow>(
        `SELECT id, question_id, acceptable_answer, case_sensitive
         FROM short_answer_keys
         WHERE question_id = ANY($1)
         ORDER BY question_id, id`,
        [questionIds],
      )
    : { rows: [] as AttemptReviewShortAnswerKeyRow[] };

  const shortAnswerKeysByQuestion = new Map<
    string,
    Array<{ acceptableAnswer: string; caseSensitive: boolean }>
  >();
  shortAnswerRes.rows.forEach((row) => {
    const list = shortAnswerKeysByQuestion.get(row.question_id) ?? [];
    list.push({
      acceptableAnswer: row.acceptable_answer,
      caseSensitive: row.case_sensitive,
    });
    shortAnswerKeysByQuestion.set(row.question_id, list);
  });

  return questionRes.rows.map((row) => ({
    id: row.question_id,
    position: row.position,
    type: row.question_type,
    exists: row.question_exists,
    stem: row.stem,
    explanation: row.explanation ?? null,
    correctOptionIds: correctOptionIdsByQuestion.get(row.question_id) ?? [],
    shortAnswerKeys: shortAnswerKeysByQuestion.get(row.question_id) ?? [],
    passage: row.passage_id
      ? {
          id: row.passage_id,
          content: row.passage_content ?? "",
          mediaUrls: row.passage_media_urls ?? [],
          position: row.passage_position ?? 1,
        }
      : null,
    options: optionsByQuestion.get(row.question_id) ?? [],
  }));
}

export async function listQuestionReviewDetails(questionIds: string[]): Promise<
  Array<{
    questionId: string;
    explanation: string | null;
    correctOptionIds: string[];
    shortAnswerKeys: Array<{
      acceptableAnswer: string;
      caseSensitive: boolean;
    }>;
  }>
> {
  if (!questionIds.length) return [];
  const uniqueQuestionIds = Array.from(new Set(questionIds));

  const [explanationRes, optionRes, shortAnswerRes] = await Promise.all([
    query<{ id: string; explanation: string | null }>(
      `SELECT id, explanation
       FROM questions
       WHERE id = ANY($1)`,
      [uniqueQuestionIds],
    ),
    query<{ id: string; question_id: string; is_correct: boolean }>(
      `SELECT id, question_id, is_correct
       FROM question_options
       WHERE question_id = ANY($1)
       ORDER BY question_id, position`,
      [uniqueQuestionIds],
    ),
    query<AttemptReviewShortAnswerKeyRow>(
      `SELECT id, question_id, acceptable_answer, case_sensitive
       FROM short_answer_keys
       WHERE question_id = ANY($1)
       ORDER BY question_id, id`,
      [uniqueQuestionIds],
    ),
  ]);

  const explanationById = new Map(
    explanationRes.rows.map((row) => [row.id, row.explanation ?? null]),
  );

  const correctOptionIdsByQuestion = new Map<string, string[]>();
  optionRes.rows.forEach((row) => {
    if (!row.is_correct) return;
    const list = correctOptionIdsByQuestion.get(row.question_id) ?? [];
    list.push(row.id);
    correctOptionIdsByQuestion.set(row.question_id, list);
  });

  const shortAnswerKeysByQuestion = new Map<
    string,
    Array<{ acceptableAnswer: string; caseSensitive: boolean }>
  >();
  shortAnswerRes.rows.forEach((row) => {
    const list = shortAnswerKeysByQuestion.get(row.question_id) ?? [];
    list.push({
      acceptableAnswer: row.acceptable_answer,
      caseSensitive: row.case_sensitive,
    });
    shortAnswerKeysByQuestion.set(row.question_id, list);
  });

  return uniqueQuestionIds.map((questionId) => ({
    questionId,
    explanation: explanationById.get(questionId) ?? null,
    correctOptionIds: correctOptionIdsByQuestion.get(questionId) ?? [],
    shortAnswerKeys: shortAnswerKeysByQuestion.get(questionId) ?? [],
  }));
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

function mapAttemptHistoryRow(
  row: AttemptHistoryRow,
): Omit<AttemptHistoryItem, "quizExists" | "canRedo"> {
  return {
    attemptId: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title ?? null,
    quizDifficulty: clampDifficulty(row.quiz_difficulty_level),
    quizEstimatedTimeSeconds: row.quiz_estimated_time_seconds,
    isChallenge: row.is_challenge,
    subjectScoresEstimated: row.subject_scores_estimated,
    subjectScores: (row.subject_scores ?? []).map((item) => ({
      subjectId: item.subjectId,
      name: item.name,
      slug: item.slug,
      correctCount: Number(item.correctCount),
      totalQuestions: Number(item.totalQuestions),
      irtScore: Number(item.irtScore ?? 0),
      scorePercent: Number(item.scorePercent),
    })),
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    scorePercent: Number(row.score_percent),
    correctCount: Number(row.correct_count),
    totalQuestions: Number(row.total_questions),
    xpEarned: Number(row.xp_earned),
    customQuiz: row.custom_quiz_id
      ? {
          id: row.custom_quiz_id,
          config: row.custom_config ?? {},
        }
      : undefined,
  };
}

function clampDifficulty(value: number | null): DifficultyLevel {
  if (!value || !Number.isFinite(value)) return 3;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(1, rounded)) as DifficultyLevel;
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

export async function listQuizQuestionMetaByIds(
  quizId: string,
  questionIds: string[],
): Promise<QuizQuestionMeta[]> {
  if (!questionIds.length) return [];
  const res = await query<{ question_id: string; type: QuestionType }>(
    `SELECT qq.question_id, q.type
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     WHERE qq.quiz_id = $1
       AND qq.question_id = ANY($2)`,
    [quizId, questionIds],
  );
  return res.rows.map((row) => ({
    questionId: row.question_id,
    type: row.type,
  }));
}

export async function listQuizGradingData(
  quizId: string,
  client?: PoolClient,
): Promise<QuizQuestionGrading[]> {
  const baseRes = await runQuery<{
    question_id: string;
    type: QuestionType;
    default_score: number;
    score: number | null;
    required: boolean;
    position: number;
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    question_updated_at: string;
  }>(
    client,
    `SELECT qq.question_id,
            qq.position,
            qq.score,
            qq.required,
            q.type,
            q.default_score,
            q.subject_id,
            subj.name AS subject_name,
            subj.slug AS subject_slug,
            q.updated_at AS question_updated_at
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     JOIN subjects subj ON subj.id = q.subject_id
     WHERE qq.quiz_id = $1
     ORDER BY qq.position ASC`,
    [quizId],
  );

  const questionIds = baseRes.rows.map((row) => row.question_id);
  const optionRes = questionIds.length
    ? await runQuery<{ id: string; question_id: string; is_correct: boolean }>(
        client,
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
    ? await runQuery<{
        question_id: string;
        acceptable_answer: string;
        case_sensitive: boolean;
      }>(
        client,
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
      required: row.required,
      position: row.position,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectSlug: row.subject_slug,
      questionUpdatedAt: row.question_updated_at,
      optionIds: options.map((opt) => opt.id),
      correctOptionIds: options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id),
      shortAnswerKeys: shortAnswerGroups.get(row.question_id) ?? [],
    };
  });
}

export async function listQuizGradingDataByQuestionIds(
  quizId: string,
  questionIds: string[],
  client?: PoolClient,
): Promise<QuizQuestionGrading[]> {
  if (!questionIds.length) return [];
  const baseRes = await runQuery<{
    question_id: string;
    type: QuestionType;
    default_score: number;
    score: number | null;
    required: boolean;
    position: number;
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    question_updated_at: string;
  }>(
    client,
    `SELECT qq.question_id,
            qq.position,
            qq.score,
            qq.required,
            q.type,
            q.default_score,
            q.subject_id,
            subj.name AS subject_name,
            subj.slug AS subject_slug,
            q.updated_at AS question_updated_at
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     JOIN subjects subj ON subj.id = q.subject_id
     WHERE qq.quiz_id = $1
       AND qq.question_id = ANY($2::uuid[])
     ORDER BY qq.position ASC`,
    [quizId, questionIds],
  );

  const ids = baseRes.rows.map((row) => row.question_id);
  const optionRes = ids.length
    ? await runQuery<{ id: string; question_id: string; is_correct: boolean }>(
        client,
        `SELECT id, question_id, is_correct
         FROM question_options
         WHERE question_id = ANY($1)`,
        [ids],
      )
    : {
        rows: [] as Array<{
          id: string;
          question_id: string;
          is_correct: boolean;
        }>,
      };

  const shortAnswerRes = ids.length
    ? await runQuery<{
        question_id: string;
        acceptable_answer: string;
        case_sensitive: boolean;
      }>(
        client,
        `SELECT question_id, acceptable_answer, case_sensitive
         FROM short_answer_keys
         WHERE question_id = ANY($1)`,
        [ids],
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
      required: row.required,
      position: row.position,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectSlug: row.subject_slug,
      questionUpdatedAt: row.question_updated_at,
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
}): Promise<AttemptRow | null> {
  return withTransaction(async (client) => {
    const attemptRes = await client.query<AttemptRow>(
      `SELECT * FROM attempts WHERE id = $1 FOR UPDATE`,
      [input.attemptId],
    );
    const attemptRow = attemptRes.rows[0];
    if (!attemptRow) return null;

    if (attemptRow.status !== "in_progress") {
      return attemptRow;
    }

    let updatedAttemptRow = attemptRow;
    if (input.remainingSeconds !== undefined) {
      const updatedRes = await client.query<AttemptRow>(
        `UPDATE attempts SET remaining_seconds = $2 WHERE id = $1 RETURNING *`,
        [input.attemptId, input.remainingSeconds],
      );
      const updated = updatedRes.rows[0];
      if (updated) {
        updatedAttemptRow = updated;
      }
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
    return updatedAttemptRow;
  });
}

export async function submitAttempt(
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  return withTransaction(async (client) =>
    submitAttemptWithClient(client, input),
  );
}

export async function submitAttemptWithClient(
  client: PoolClient,
  input: SubmitAttemptInput,
  options?: {
    status?: "submitted" | "auto_submitted";
    submittedAt?: string | null;
    judgedAt?: string | null;
    xpEventCreatedAt?: string | null;
  },
): Promise<SubmitAttemptResult> {
  const attemptRes = await client.query<AttemptRow>(
    `SELECT * FROM attempts WHERE id = $1 FOR UPDATE`,
    [input.attemptId],
  );
  const attemptRow = attemptRes.rows[0];
  if (!attemptRow) return { status: "not_found" };
  if (attemptRow.status !== "in_progress") {
    return { status: "already_submitted", attempt: mapAttempt(attemptRow) };
  }

  const firstAttempt = await getOrCreateUserQuizFirstAttempt(client, {
    userId: attemptRow.user_id,
    quizId: attemptRow.quiz_id,
    attemptId: attemptRow.id,
  });

  await upsertGradedAnswers(client, input.attemptId, input.gradedAnswers);
  await insertAnswerEvents(
    client,
    input.attemptId,
    input.gradedAnswers,
    "submit",
  );

  await insertAttemptQuestionSnapshots(
    client,
    input.attemptId,
    attemptRow.judgement_version ?? 1,
    input.questionSnapshots,
  );

  if (firstAttempt.isFirst) {
    await applyQuestionIrtStatsDelta(
      client,
      input.gradedAnswers.map((answer) => ({
        questionId: answer.questionId,
        attemptDelta: 1,
        correctDelta: answer.isCorrect ? 1 : 0,
      })),
    );
  }

  const status = options?.status ?? "submitted";
  const submittedAt = options?.submittedAt ?? null;
  const judgedAt = options?.judgedAt ?? submittedAt ?? null;

  const updatedRes = await client.query<AttemptRow>(
    `UPDATE attempts
     SET status = $15::attempt_status,
         submitted_at = COALESCE($16::timestamptz, now()),
         judged_at = COALESCE($17::timestamptz, now()),
         total_questions = $7,
         remaining_seconds = $2,
         score_raw = $3,
         score_percent = $4,
         correct_count = $5,
         xp_earned = $6,
         quiz_content_hash_snapshot = $8,
         snapshot_quiz_title = $9,
         snapshot_quiz_difficulty_level = $10,
         snapshot_quiz_estimated_time_seconds = $11,
         snapshot_quiz_is_challenge = $12,
         snapshot_subject_scores = $13::jsonb,
         snapshot_subject_scores_estimated = $14
     WHERE id = $1
     RETURNING *`,
    [
      input.attemptId,
      input.remainingSeconds,
      input.scoreRaw,
      input.scorePercent,
      input.correctCount,
      input.xpEvent.amount,
      input.totalQuestions,
      input.snapshot.quizContentHash,
      input.snapshot.quizTitle,
      input.snapshot.quizDifficultyLevel,
      input.snapshot.quizEstimatedTimeSeconds,
      input.snapshot.isChallenge,
      JSON.stringify(input.snapshot.subjectScores ?? []),
      input.snapshot.subjectScoresEstimated,
      status,
      submittedAt,
      judgedAt,
    ],
  );

  if (firstAttempt.isFirst) {
    const xpEventCreatedAt = options?.xpEventCreatedAt ?? null;
    await insertXpEvent(
      xpEventCreatedAt
        ? { ...input.xpEvent, createdAt: xpEventCreatedAt }
        : input.xpEvent,
      client,
    );
  }

  const updated = updatedRes.rows[0];
  if (!updated) throw new Error("Failed to submit attempt");
  return { status: "ok", attempt: mapAttempt(updated) };
}

export async function rejudgeAttempt(
  input: RejudgeAttemptInput,
): Promise<RejudgeAttemptResult> {
  return withTransaction(async (client) => {
    const attemptRes = await client.query<AttemptRow>(
      `SELECT * FROM attempts WHERE id = $1 FOR UPDATE`,
      [input.attemptId],
    );
    const attemptRow = attemptRes.rows[0];
    if (!attemptRow) return { status: "not_found" };
    if (
      attemptRow.status !== "submitted" &&
      attemptRow.status !== "auto_submitted"
    ) {
      return { status: "not_submitted" };
    }
    if (attemptRow.judgement_version !== input.expectedJudgementVersion) {
      return { status: "conflict" };
    }

    const newJudgementVersion = attemptRow.judgement_version + 1;

    const firstAttempt = await getOrCreateUserQuizFirstAttempt(client, {
      userId: attemptRow.user_id,
      quizId: attemptRow.quiz_id,
      attemptId: attemptRow.id,
    });

    const previousCorrectByQuestion = new Map<string, boolean>();
    if (firstAttempt.isFirst && input.gradedAnswers.length) {
      const questionIds = input.gradedAnswers.map(
        (answer) => answer.questionId,
      );
      const prevRes = await client.query<{
        question_id: string;
        is_correct: boolean | null;
      }>(
        `SELECT question_id, is_correct
         FROM attempt_answers
         WHERE attempt_id = $1
           AND question_id = ANY($2::uuid[])`,
        [input.attemptId, questionIds],
      );
      prevRes.rows.forEach((row) => {
        previousCorrectByQuestion.set(row.question_id, row.is_correct === true);
      });
    }

    await updateAttemptAnswerJudgements(
      client,
      input.attemptId,
      input.gradedAnswers,
    );

    await insertRejudgeEvents(client, input.attemptId, input.gradedAnswers, {
      judgementVersion: newJudgementVersion,
    });

    await insertAttemptQuestionSnapshots(
      client,
      input.attemptId,
      newJudgementVersion,
      input.questionSnapshots,
    );

    if (firstAttempt.isFirst && previousCorrectByQuestion.size) {
      await applyQuestionIrtStatsDelta(
        client,
        input.gradedAnswers.map((answer) => {
          const prev =
            previousCorrectByQuestion.get(answer.questionId) === true;
          const next = answer.isCorrect === true;
          return {
            questionId: answer.questionId,
            attemptDelta: 0,
            correctDelta: (next ? 1 : 0) - (prev ? 1 : 0),
          };
        }),
      );
    }

    const updatedRes = await client.query<AttemptRow>(
      `UPDATE attempts
       SET judged_at = now(),
           judgement_version = $2,
           total_questions = $3,
           score_raw = $4,
           score_percent = $5,
           correct_count = $6,
           xp_earned = $7,
           quiz_content_hash_snapshot = $8,
           snapshot_quiz_title = $9,
           snapshot_quiz_difficulty_level = $10,
           snapshot_quiz_estimated_time_seconds = $11,
           snapshot_quiz_is_challenge = $12,
           snapshot_subject_scores = $13::jsonb,
           snapshot_subject_scores_estimated = $14
       WHERE id = $1
       RETURNING *`,
      [
        input.attemptId,
        newJudgementVersion,
        input.totalQuestions,
        input.scoreRaw,
        input.scorePercent,
        input.correctCount,
        input.xpEarned,
        input.snapshot.quizContentHash,
        input.snapshot.quizTitle,
        input.snapshot.quizDifficultyLevel,
        input.snapshot.quizEstimatedTimeSeconds,
        input.snapshot.isChallenge,
        JSON.stringify(input.snapshot.subjectScores ?? []),
        input.snapshot.subjectScoresEstimated,
      ],
    );

    if (
      firstAttempt.isFirst &&
      input.xpAdjustmentEvent &&
      input.xpAdjustmentEvent.amount !== 0
    ) {
      await insertXpEvent(input.xpAdjustmentEvent, client);
    }

    const updated = updatedRes.rows[0];
    if (!updated) throw new Error("Failed to rejudge attempt");
    return {
      status: "ok",
      attempt: mapAttempt(updated),
      judgementVersion: newJudgementVersion,
    };
  });
}

async function insertAttemptQuestionSnapshots(
  client: PoolClient,
  attemptId: string,
  judgementVersion: number,
  items: SubmitAttemptInput["questionSnapshots"],
) {
  if (!items.length) return;
  const values: string[] = [];
  const params: unknown[] = [attemptId, judgementVersion];
  items.forEach((item, index) => {
    const base = index * 9;
    values.push(
      `($1, $2, $${base + 3}, $${base + 4}, $${base + 5}::question_type, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`,
    );
    params.push(
      item.position,
      item.questionId,
      item.questionType,
      item.maxScore,
      item.required,
      item.subjectId,
      item.subjectName,
      item.subjectSlug,
      item.questionUpdatedAt,
    );
  });

  await client.query(
    `INSERT INTO attempt_question_snapshots (
       attempt_id,
       judgement_version,
       position,
       question_id,
       question_type,
       max_score,
       required,
       subject_id,
       subject_name,
       subject_slug,
       question_updated_at
     ) VALUES ${values.join(", ")}
     ON CONFLICT (attempt_id, judgement_version, question_id) DO NOTHING`,
    params,
  );
}

async function updateAttemptAnswerJudgements(
  client: PoolClient,
  attemptId: string,
  answers: Array<
    Pick<
      GradedAnswerInput,
      "questionId" | "isCorrect" | "awardedScore" | "awardedIrtScore"
    >
  >,
) {
  if (!answers.length) return;
  const values: string[] = [];
  const params: unknown[] = [attemptId];
  answers.forEach((answer, index) => {
    const base = index * 4;
    values.push(
      `($${base + 2}::uuid, $${base + 3}::boolean, $${base + 4}::numeric, $${base + 5}::int)`,
    );
    params.push(
      answer.questionId,
      answer.isCorrect,
      answer.awardedScore,
      answer.awardedIrtScore,
    );
  });

  await client.query(
    `UPDATE attempt_answers aa
     SET is_correct = v.is_correct,
         awarded_score = v.awarded_score,
         awarded_irt_score = v.awarded_irt_score
     FROM (VALUES ${values.join(", ")}) AS v(question_id, is_correct, awarded_score, awarded_irt_score)
     WHERE aa.attempt_id = $1
       AND aa.question_id = v.question_id`,
    params,
  );
}

async function insertRejudgeEvents(
  client: PoolClient,
  attemptId: string,
  answers: Array<
    Pick<
      GradedAnswerInput,
      "questionId" | "isCorrect" | "awardedScore" | "awardedIrtScore"
    >
  >,
  meta?: Record<string, unknown>,
) {
  if (!answers.length) return;
  const values: string[] = [];
  const params: unknown[] = [attemptId];
  answers.forEach((answer, index) => {
    const base = index * 3;
    values.push(`($1, $${base + 2}, $${base + 3}::jsonb, $${base + 4})`);
    const payload = {
      isCorrect: answer.isCorrect,
      awardedScore: answer.awardedScore,
      awardedIrtScore: answer.awardedIrtScore,
      ...(meta ?? {}),
    };
    params.push(answer.questionId, payload, "rejudge");
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
    const base = index * 6;
    values.push(
      `($1, $${base + 2}, $${base + 3}::uuid[], $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, now(), false)`,
    );
    params.push(
      answer.questionId,
      answer.selectedOptionIds,
      answer.textAnswer,
      answer.isCorrect,
      answer.awardedScore,
      answer.awardedIrtScore,
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
       awarded_irt_score,
       answered_at,
       auto_saved
     ) VALUES ${values.join(", ")}
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET
       selected_option_ids = EXCLUDED.selected_option_ids,
       text_answer = EXCLUDED.text_answer,
       is_correct = EXCLUDED.is_correct,
       awarded_score = EXCLUDED.awarded_score,
       awarded_irt_score = EXCLUDED.awarded_irt_score,
       answered_at = EXCLUDED.answered_at,
       auto_saved = FALSE`,
    params,
  );
}

async function insertAnswerEvents(
  client: PoolClient,
  attemptId: string,
  answers: Array<AttemptAnswerInput | GradedAnswerInput>,
  eventType: "autosave" | "submit" | "rejudge",
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
        awardedIrtScore: answer.awardedIrtScore,
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
