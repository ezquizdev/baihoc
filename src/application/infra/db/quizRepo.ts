import type { PoolClient } from "pg";
import { query, withTransaction } from "@/application/infra/db/pool";
import type { DifficultyLevel } from "@/application/models/enums";
import type { QuestionType } from "@/application/models/question";
import type {
  ChallengeSettings,
  Quiz,
  QuizCatalogItem,
  QuizDetail,
  QuizListItem,
  QuizQuestionLink,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/quiz";

export type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: DifficultyLevel;
  visibility: QuizVisibility;
  status: QuizStatus;
  is_challenge: boolean;
  estimated_time_seconds: number | null;
  featured_rank: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  question_count?: number | null;
};

export type ChallengeSettingsRow = {
  quiz_id: string;
  start_at: string;
  end_at: string;
};

export type QuizQuestionRow = {
  quiz_id: string;
  question_id: string;
  position: number;
  score: number | null;
  required: boolean;
  stem: string;
  type: QuestionType;
  default_score: number;
};

type QuizCatalogRow = QuizRow & {
  question_count: number | null;
  attempt_count: number | null;
  user_attempted: boolean | null;
  total_count: number;
  subject_breakdown: Array<{
    subjectId: string;
    name: string;
    slug: string;
    questionCount: number;
  }> | null;
  topic_ids: string[] | null;
};

const searchVectorSql =
  "to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))";
const insertSearchVectorSql =
  "to_tsvector('simple', coalesce($1, '') || ' ' || coalesce($2, ''))";

function mapQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty_level,
    visibility: row.visibility,
    status: row.status,
    isChallenge: row.is_challenge,
    estimatedTimeSeconds: row.estimated_time_seconds,
    featuredRank: row.featured_rank,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    questionCount:
      row.question_count !== undefined && row.question_count !== null
        ? Number(row.question_count)
        : undefined,
  };
}

function mapChallenge(
  row: ChallengeSettingsRow | undefined,
): ChallengeSettings | null {
  if (!row) return null;
  return {
    quizId: row.quiz_id,
    startAt: row.start_at,
    endAt: row.end_at,
  };
}

function mapQuestionRow(row: QuizQuestionRow) {
  return {
    id: row.question_id,
    stem: row.stem,
    type: row.type,
    defaultScore: Number(row.default_score),
    position: row.position,
    score: row.score !== null ? Number(row.score) : null,
    required: row.required,
  };
}

function mapCatalogRow(row: QuizCatalogRow): QuizCatalogItem {
  const breakdown = row.subject_breakdown ?? [];
  const primarySubject = breakdown.length === 1 ? breakdown[0] : null;
  return {
    ...mapQuiz(row),
    subjectName: primarySubject?.name ?? "Tổng hợp",
    subjectSlug: primarySubject?.slug ?? "mixed",
    attemptCount: Number(row.attempt_count ?? 0),
    userAttempted: Boolean(row.user_attempted),
    subjectBreakdown: breakdown,
    topicIds: row.topic_ids ?? undefined,
  };
}

export async function insertQuiz(input: {
  title: string;
  description?: string | null;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  status?: QuizStatus;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  featuredRank?: number | null;
  createdBy: string;
  challenge?: Partial<ChallengeSettings>;
}) {
  const quiz = await withTransaction(async (client) => {
    const res = await client.query<QuizRow>(
      `INSERT INTO quizzes (
        title, description, difficulty_level, visibility, status,
        is_challenge, estimated_time_seconds, featured_rank,
        created_by, search_vector
      ) VALUES (
        $1, $2, $3, $4::quiz_visibility,
        COALESCE($5::quiz_status, 'draft'),
        COALESCE($6, false), $7, $8, $9, ${insertSearchVectorSql}
      ) RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.difficulty,
        input.visibility,
        input.status ?? "draft",
        input.isChallenge ?? false,
        input.estimatedTimeSeconds ?? null,
        input.featuredRank ?? null,
        input.createdBy,
      ],
    );

    const quizRow = res.rows[0];
    if (!quizRow) {
      throw new Error("Failed to insert quiz");
    }

    if (quizRow.is_challenge && hasCompleteChallenge(input.challenge)) {
      const { startAt, endAt } = input.challenge;
      await upsertChallengeInternal(client, {
        quizId: quizRow.id,
        startAt,
        endAt,
      });
    }

    return mapQuiz(quizRow);
  });

  return quiz;
}

export async function updateQuiz(input: {
  quizId: string;
  title?: string;
  description?: string | null;
  difficulty?: DifficultyLevel;
  visibility?: QuizVisibility;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  featuredRank?: number | null;
  status?: QuizStatus;
  challenge?: Partial<ChallengeSettings> | null;
}) {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const push = (sql: string, value: unknown) => {
    fields.push(sql.replaceAll("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (input.title !== undefined) push("title = $idx", input.title);
  if (input.description !== undefined)
    push("description = $idx", input.description);
  if (input.difficulty !== undefined)
    push("difficulty_level = $idx", input.difficulty);
  if (input.visibility !== undefined)
    push("visibility = $idx::quiz_visibility", input.visibility);
  if (input.isChallenge !== undefined)
    push("is_challenge = $idx", input.isChallenge);
  if (input.estimatedTimeSeconds !== undefined)
    push("estimated_time_seconds = $idx", input.estimatedTimeSeconds);
  if (input.featuredRank !== undefined)
    push("featured_rank = $idx", input.featuredRank);
  if (input.status !== undefined)
    push("status = $idx::quiz_status", input.status);

  const shouldRefreshSearch =
    input.title !== undefined || input.description !== undefined;
  if (shouldRefreshSearch) {
    fields.push(`search_vector = ${searchVectorSql}`);
  }
  fields.push("updated_at = now()");

  const quiz = await withTransaction(async (client) => {
    let updatedRow: QuizRow | undefined;
    if (fields.length > 0) {
      params.push(input.quizId);
      const res = await client.query<QuizRow>(
        `UPDATE quizzes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        params,
      );
      updatedRow = res.rows[0];
    } else {
      const existing = await client.query<QuizRow>(
        `SELECT * FROM quizzes WHERE id = $1`,
        [input.quizId],
      );
      updatedRow = existing.rows[0];
    }

    if (!updatedRow) {
      throw new Error("Quiz not found");
    }

    if (updatedRow.is_challenge) {
      if (input.challenge === null) {
        await client.query(
          `DELETE FROM challenge_settings WHERE quiz_id = $1`,
          [input.quizId],
        );
      } else if (hasCompleteChallenge(input.challenge)) {
        const { startAt, endAt } = input.challenge;
        await upsertChallengeInternal(client, {
          quizId: input.quizId,
          startAt,
          endAt,
        });
      }
    } else {
      await client.query(`DELETE FROM challenge_settings WHERE quiz_id = $1`, [
        input.quizId,
      ]);
    }

    return mapQuiz(updatedRow);
  });

  return quiz;
}

export async function updateQuizStatus(quizId: string, status: QuizStatus) {
  const res = await query<QuizRow>(
    `UPDATE quizzes
     SET status = $2::quiz_status,
         published_at = CASE WHEN $2 = 'published' THEN now() ELSE published_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [quizId, status],
  );
  return res.rows[0] ? mapQuiz(res.rows[0]) : null;
}

export async function getQuizQuestionCount(
  quizId: string,
): Promise<number | null> {
  const res = await query<{ question_count: number | null }>(
    `SELECT COALESCE(qc.question_count, 0) AS question_count
     FROM quizzes q
     LEFT JOIN (
       SELECT quiz_id, COUNT(*)::int AS question_count
       FROM quiz_questions
       GROUP BY quiz_id
     ) qc ON qc.quiz_id = q.id
     WHERE q.id = $1`,
    [quizId],
  );
  if (!res.rows[0]) return null;
  const count = res.rows[0].question_count ?? 0;
  return Number.isFinite(count) ? Number(count) : 0;
}

export async function replaceQuizQuestions(
  quizId: string,
  items: Array<Omit<QuizQuestionLink, "quizId">>,
) {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM quiz_questions WHERE quiz_id = $1`, [
      quizId,
    ]);
    if (!items.length) return;
    const values: string[] = [];
    const params: unknown[] = [];
    items.forEach((item, index) => {
      const base = index * 4;
      values.push(
        `($1, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      );
      params.push(item.questionId);
      params.push(item.position);
      params.push(item.score);
      params.push(item.required);
    });
    await client.query(
      `INSERT INTO quiz_questions (quiz_id, question_id, position, score, required)
       VALUES ${values.join(", ")}
       ON CONFLICT (quiz_id, question_id) DO NOTHING`,
      [quizId, ...params],
    );
  });
}

export async function getQuizDetail(
  quizId: string,
): Promise<QuizDetail | null> {
  const quizRes = await query<QuizRow>(
    `SELECT q.*,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
     FROM quizzes q
     WHERE q.id = $1`,
    [quizId],
  );
  const quizRow = quizRes.rows[0];
  if (!quizRow) return null;

  const [topicsRes, subjectsRes] = await Promise.all([
    query<{ topic_id: string }>(
      `SELECT DISTINCT qt.topic_id
       FROM quiz_questions qq
       JOIN question_topics qt ON qt.question_id = qq.question_id
       WHERE qq.quiz_id = $1`,
      [quizId],
    ),
    query<{ subject_id: string }>(
      `SELECT DISTINCT q.subject_id
       FROM quiz_questions qq
       JOIN questions q ON q.id = qq.question_id
       WHERE qq.quiz_id = $1`,
      [quizId],
    ),
  ]);

  const challengeRes = await query<ChallengeSettingsRow>(
    `SELECT quiz_id, start_at, end_at
     FROM challenge_settings
     WHERE quiz_id = $1`,
    [quizId],
  );

  const questionsRes = await query<QuizQuestionRow>(
    `SELECT qq.quiz_id, qq.question_id, qq.position, qq.score, qq.required,
            q.stem, q.type, q.default_score
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     WHERE qq.quiz_id = $1
     ORDER BY qq.position ASC`,
    [quizId],
  );

  return {
    ...mapQuiz(quizRow),
    topicIds: topicsRes.rows.map((r) => r.topic_id),
    subjectIds: subjectsRes.rows.map((r) => r.subject_id),
    questions: questionsRes.rows.map(mapQuestionRow),
    challenge: mapChallenge(challengeRes.rows[0]),
  };
}

export async function listQuizzesForCatalog(params: {
  subjectId?: string;
  topicIds?: string[];
  difficulty?: DifficultyLevel;
  visibility?: QuizVisibility;
  search?: string;
  limit?: number;
  offset?: number;
  minQuestions?: number;
  maxQuestions?: number;
}): Promise<QuizListItem[]> {
  const where: string[] = [
    "q.status = 'published'",
    `NOT EXISTS (
      SELECT 1
      FROM custom_quizzes cq
      WHERE cq.generated_quiz_id = q.id
        AND cq.status = 'ready'::custom_quiz_status
    )`,
  ];
  const values: unknown[] = [];

  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  if (params.subjectId) {
    add(
      `q.id IN (
        SELECT qq.quiz_id
        FROM quiz_questions qq
        JOIN questions qn ON qn.id = qq.question_id
        WHERE qn.subject_id = $idx
      )`,
      params.subjectId,
    );
  }
  if (params.difficulty) add("q.difficulty_level = $idx", params.difficulty);
  if (params.visibility)
    add("q.visibility = $idx::quiz_visibility", params.visibility);
  if (params.topicIds?.length) {
    add(
      `q.id IN (
        SELECT qq.quiz_id
        FROM quiz_questions qq
        JOIN question_topics qt ON qt.question_id = qq.question_id
        WHERE qt.topic_id = ANY($idx::uuid[])
      )`,
      params.topicIds,
    );
  }
  if (params.minQuestions !== undefined) {
    add("COALESCE(qc.question_count, 0) >= $idx", params.minQuestions);
  }
  if (params.maxQuestions !== undefined) {
    add("COALESCE(qc.question_count, 0) <= $idx", params.maxQuestions);
  }
  if (params.search) {
    add(
      "(q.title ILIKE $idx OR q.description ILIKE $idx)",
      `%${params.search}%`,
    );
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  values.push(limit);
  values.push(offset);

  const res = await query<
    QuizRow & {
      topic_ids: string[];
      subject_ids: string[];
    }
  >(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            COALESCE(qs.subject_ids, '{}') AS subject_ids,
            qc.question_count
     FROM quizzes q
     LEFT JOIN (
       SELECT quiz_id, COUNT(*) AS question_count
       FROM quiz_questions
       GROUP BY quiz_id
     ) qc ON qc.quiz_id = q.id
     LEFT JOIN (
       SELECT qq.quiz_id,
              array_agg(DISTINCT qt.topic_id) FILTER (WHERE qt.topic_id IS NOT NULL) AS topic_ids
       FROM quiz_questions qq
       JOIN question_topics qt ON qt.question_id = qq.question_id
       GROUP BY qq.quiz_id
     ) qt ON qt.quiz_id = q.id
     LEFT JOIN (
       SELECT qq.quiz_id,
              array_agg(DISTINCT qn.subject_id) FILTER (WHERE qn.subject_id IS NOT NULL) AS subject_ids
       FROM quiz_questions qq
       JOIN questions qn ON qn.id = qq.question_id
       GROUP BY qq.quiz_id
     ) qs ON qs.quiz_id = q.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY q.published_at DESC NULLS LAST, q.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return res.rows.map((row) => ({
    ...mapQuiz(row),
    topicIds: row.topic_ids ?? [],
    subjectIds: row.subject_ids ?? [],
  }));
}

export async function listCatalogPage(params: {
  userId: string;
  subjectIds?: string[];
  difficulty?: DifficultyLevel[];
  search?: string;
  minQuestions?: number;
  maxQuestions?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  status?: "todo" | "done" | "challenge" | "all";
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}): Promise<{ items: QuizCatalogItem[]; total: number }> {
  const where: string[] = [
    "q.status = 'published'",
    `NOT EXISTS (
      SELECT 1
      FROM custom_quizzes cq
      WHERE cq.generated_quiz_id = q.id
        AND cq.status = 'ready'::custom_quiz_status
    )`,
  ];
  const values: unknown[] = [params.userId];

  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  if (params.subjectIds?.length) {
    add(
      `q.id IN (
        SELECT qq.quiz_id
        FROM quiz_questions qq
        JOIN questions qn ON qn.id = qq.question_id
        WHERE qn.subject_id = ANY($idx::uuid[])
      )`,
      params.subjectIds,
    );
  }
  if (params.difficulty?.length) {
    add("q.difficulty_level = ANY($idx::int[])", params.difficulty);
  }
  if (params.search) {
    add(
      "(q.title ILIKE $idx OR q.description ILIKE $idx)",
      `%${params.search}%`,
    );
  }
  if (params.minQuestions !== undefined) {
    add("COALESCE(qc.question_count, 0) >= $idx", params.minQuestions);
  }
  if (params.maxQuestions !== undefined) {
    add("COALESCE(qc.question_count, 0) <= $idx", params.maxQuestions);
  }
  if (params.minDurationSeconds !== undefined) {
    add(
      "COALESCE(q.estimated_time_seconds, 0) >= $idx",
      params.minDurationSeconds,
    );
  }
  if (params.maxDurationSeconds !== undefined) {
    add(
      "COALESCE(q.estimated_time_seconds, 0) <= $idx",
      params.maxDurationSeconds,
    );
  }
  if (params.status === "challenge") {
    where.push("q.is_challenge IS TRUE");
  }
  if (params.status === "done") {
    where.push("ua.user_attempted IS TRUE");
  }
  if (params.status === "todo") {
    where.push("ua.user_attempted IS NULL");
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  values.push(limit);
  values.push(offset);

  const orderBy =
    params.sort === "oldest" ? "q.updated_at ASC" : "q.updated_at DESC";

  const res = await query<QuizCatalogRow>(
    `SELECT q.*,
            qc.question_count,
            ac.attempt_count,
            ua.user_attempted,
            sb.subject_breakdown,
            tb.topic_ids,
            COUNT(*) OVER() AS total_count
     FROM quizzes q
     LEFT JOIN (
       SELECT quiz_id, COUNT(*)::int AS question_count
       FROM quiz_questions
       GROUP BY quiz_id
     ) qc ON qc.quiz_id = q.id
     LEFT JOIN (
       SELECT quiz_id, COUNT(*)::int AS attempt_count
       FROM attempts
       GROUP BY quiz_id
     ) ac ON ac.quiz_id = q.id
     LEFT JOIN (
       SELECT quiz_id, true AS user_attempted
       FROM attempts
       WHERE user_id = $1
       GROUP BY quiz_id
     ) ua ON ua.quiz_id = q.id
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'subjectId', subj.id,
           'name', subj.name,
           'slug', subj.slug,
           'questionCount', qb.question_count
         )
         ORDER BY subj.name
       ) AS subject_breakdown
       FROM (
         SELECT qn.subject_id, COUNT(*)::int AS question_count
         FROM quiz_questions qq
         JOIN questions qn ON qn.id = qq.question_id
         WHERE qq.quiz_id = q.id
         GROUP BY qn.subject_id
       ) qb
       JOIN subjects subj ON subj.id = qb.subject_id
     ) sb ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         array_agg(DISTINCT qt.topic_id) FILTER (WHERE qt.topic_id IS NOT NULL),
         '{}'
       ) AS topic_ids
       FROM quiz_questions qq
       JOIN question_topics qt ON qt.question_id = qq.question_id
       WHERE qq.quiz_id = q.id
     ) tb ON true
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${orderBy}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  const items = res.rows.map(mapCatalogRow);
  const total = res.rows.length ? Number(res.rows[0].total_count) : 0;
  return { items, total };
}

export async function getRandomUnattemptedQuizId(
  userId: string,
): Promise<string | null> {
  const res = await query<{ id: string }>(
    `SELECT q.id
     FROM quizzes q
     WHERE q.status = 'published'
       AND q.is_challenge IS FALSE
       AND NOT EXISTS (
         SELECT 1
         FROM custom_quizzes cq
         WHERE cq.generated_quiz_id = q.id
           AND cq.status = 'ready'::custom_quiz_status
       )
       AND NOT EXISTS (
         SELECT 1
         FROM attempts a
         WHERE a.quiz_id = q.id
           AND a.user_id = $1
       )
     ORDER BY random()
     LIMIT 1`,
    [userId],
  );

  return res.rows[0]?.id ?? null;
}

export async function listQuizzesForStaff(params: {
  status?: QuizStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<QuizListItem[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  if (params.status) add("q.status = $idx::quiz_status", params.status);
  if (params.search) {
    add(
      "(q.title ILIKE $idx OR q.description ILIKE $idx)",
      `%${params.search}%`,
    );
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  values.push(limit);
  values.push(offset);

  const res = await query<
    QuizRow & { topic_ids: string[]; subject_ids: string[] }
  >(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            COALESCE(qs.subject_ids, '{}') AS subject_ids,
            qc.question_count
     FROM quizzes q
     LEFT JOIN (
       SELECT quiz_id, COUNT(*) AS question_count
       FROM quiz_questions
       GROUP BY quiz_id
     ) qc ON qc.quiz_id = q.id
     LEFT JOIN (
       SELECT qq.quiz_id,
              array_agg(DISTINCT qt.topic_id) FILTER (WHERE qt.topic_id IS NOT NULL) AS topic_ids
       FROM quiz_questions qq
       JOIN question_topics qt ON qt.question_id = qq.question_id
       GROUP BY qq.quiz_id
     ) qt ON qt.quiz_id = q.id
     LEFT JOIN (
       SELECT qq.quiz_id,
              array_agg(DISTINCT qn.subject_id) FILTER (WHERE qn.subject_id IS NOT NULL) AS subject_ids
       FROM quiz_questions qq
       JOIN questions qn ON qn.id = qq.question_id
       GROUP BY qq.quiz_id
     ) qs ON qs.quiz_id = q.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY q.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return res.rows.map((row) => ({
    ...mapQuiz(row),
    topicIds: row.topic_ids ?? [],
    subjectIds: row.subject_ids ?? [],
  }));
}

export async function isQuizUsed(quizId: string) {
  const res = await query<{ cnt: string }>(
    `SELECT COUNT(*)::int AS cnt
     FROM attempts
     WHERE quiz_id = $1
       AND status IN ('submitted', 'auto_submitted')`,
    [quizId],
  );
  return Number(res.rows[0]?.cnt ?? 0) > 0;
}

export async function hasInProgressAttempts(quizId: string) {
  const res = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1
      FROM attempts
      WHERE quiz_id = $1
        AND status = 'in_progress'
      LIMIT 1
    ) AS exists`,
    [quizId],
  );
  return Boolean(res.rows[0]?.exists);
}

export async function listQuizStatusesByIds(quizIds: string[]) {
  if (!quizIds.length) return [];
  const res = await query<{ id: string; status: QuizStatus }>(
    `SELECT id, status
     FROM quizzes
     WHERE id = ANY($1::uuid[])`,
    [quizIds],
  );
  return res.rows;
}

export async function deleteQuiz(quizId: string) {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM quiz_questions WHERE quiz_id = $1`, [
      quizId,
    ]);
    await client.query(`DELETE FROM challenge_settings WHERE quiz_id = $1`, [
      quizId,
    ]);
    await client.query(`DELETE FROM quizzes WHERE id = $1`, [quizId]);
  });
}

async function upsertChallengeInternal(
  client: PoolClient,
  input: ChallengeSettings,
) {
  await client.query(
    `INSERT INTO challenge_settings (quiz_id, start_at, end_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (quiz_id)
     DO UPDATE SET start_at = EXCLUDED.start_at,
                   end_at = EXCLUDED.end_at`,
    [input.quizId, input.startAt, input.endAt],
  );
}

function hasCompleteChallenge(
  input?: Partial<ChallengeSettings> | null,
): input is ChallengeSettings {
  return Boolean(
    input && input.startAt !== undefined && input.endAt !== undefined,
  );
}
