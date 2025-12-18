import type { PoolClient } from "pg";
import { query, withTransaction } from "@/application/infra/db/pool";
import type { QuestionType } from "@/application/models/question";
import type {
  ChallengeSettings,
  DifficultyLevel,
  Quiz,
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
  subject_id: string;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  status: QuizStatus;
  is_challenge: boolean;
  estimated_time_seconds: number | null;
  thumbnail_url: string | null;
  featured_rank: number | null;
  rating_count: number;
  rating_avg: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ChallengeSettingsRow = {
  quiz_id: string;
  start_at: string;
  end_at: string;
  time_limit_seconds: number;
  rules: unknown;
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

const searchVectorSql =
  "to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))";

function mapQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subjectId: row.subject_id,
    difficulty: row.difficulty,
    visibility: row.visibility,
    status: row.status,
    isChallenge: row.is_challenge,
    estimatedTimeSeconds: row.estimated_time_seconds,
    thumbnailUrl: row.thumbnail_url,
    featuredRank: row.featured_rank,
    ratingCount: row.rating_count,
    ratingAvg: Number(row.rating_avg),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
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
    timeLimitSeconds: row.time_limit_seconds,
    rules: row.rules,
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

export async function insertQuiz(input: {
  title: string;
  description?: string | null;
  subjectId: string;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  status?: QuizStatus;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  thumbnailUrl?: string | null;
  featuredRank?: number | null;
  createdBy: string;
  topicIds?: string[];
  challenge?: Partial<ChallengeSettings>;
}) {
  const quiz = await withTransaction(async (client) => {
    const res = await client.query<QuizRow>(
      `INSERT INTO quizzes (
        title, description, subject_id, difficulty, visibility, status,
        is_challenge, estimated_time_seconds, thumbnail_url, featured_rank,
        rating_count, rating_avg, created_by, search_vector
      ) VALUES (
        $1, $2, $3, $4::difficulty_level, $5::quiz_visibility,
        COALESCE($6::quiz_status, 'draft'),
        COALESCE($7, false), $8, $9, $10, 0, 0, $11, ${searchVectorSql}
      ) RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.subjectId,
        input.difficulty,
        input.visibility,
        input.status ?? "draft",
        input.isChallenge ?? false,
        input.estimatedTimeSeconds ?? null,
        input.thumbnailUrl ?? null,
        input.featuredRank ?? null,
        input.createdBy,
      ],
    );

    const quizRow = res.rows[0];
    if (!quizRow) {
      throw new Error("Failed to insert quiz");
    }

    if (input.topicIds?.length) {
      await insertTopics(client, quizRow.id, input.topicIds);
    }

    if (quizRow.is_challenge && input.challenge) {
      const { startAt, endAt, timeLimitSeconds, rules } = input.challenge;
      await upsertChallengeInternal(client, {
        quizId: quizRow.id,
        startAt,
        endAt,
        timeLimitSeconds,
        rules: rules ?? {},
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
  subjectId?: string;
  difficulty?: DifficultyLevel;
  visibility?: QuizVisibility;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  thumbnailUrl?: string | null;
  featuredRank?: number | null;
  status?: QuizStatus;
  topicIds?: string[];
  challenge?: Partial<ChallengeSettings> | null;
}) {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const push = (sql: string, value: unknown) => {
    fields.push(sql.replace("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (input.title !== undefined) push("title = $idx", input.title);
  if (input.description !== undefined)
    push("description = $idx", input.description);
  if (input.subjectId !== undefined) push("subject_id = $idx", input.subjectId);
  if (input.difficulty !== undefined)
    push("difficulty = $idx::difficulty_level", input.difficulty);
  if (input.visibility !== undefined)
    push("visibility = $idx::quiz_visibility", input.visibility);
  if (input.isChallenge !== undefined)
    push("is_challenge = $idx", input.isChallenge);
  if (input.estimatedTimeSeconds !== undefined)
    push("estimated_time_seconds = $idx", input.estimatedTimeSeconds);
  if (input.thumbnailUrl !== undefined)
    push("thumbnail_url = $idx", input.thumbnailUrl);
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

    if (input.topicIds) {
      await replaceTopics(client, input.quizId, input.topicIds);
    }

    if (updatedRow.is_challenge) {
      if (input.challenge === null) {
        await client.query(
          `DELETE FROM challenge_settings WHERE quiz_id = $1`,
          [input.quizId],
        );
      } else if (input.challenge) {
        const { startAt, endAt, timeLimitSeconds, rules } = input.challenge;
        await upsertChallengeInternal(client, {
          quizId: input.quizId,
          startAt,
          endAt,
          timeLimitSeconds,
          rules: rules ?? {},
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
  const quizRes = await query<QuizRow>(`SELECT * FROM quizzes WHERE id = $1`, [
    quizId,
  ]);
  const quizRow = quizRes.rows[0];
  if (!quizRow) return null;

  const topicsRes = await query<{ topic_id: string }>(
    `SELECT topic_id FROM quiz_topics WHERE quiz_id = $1`,
    [quizId],
  );

  const challengeRes = await query<ChallengeSettingsRow>(
    `SELECT * FROM challenge_settings WHERE quiz_id = $1`,
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
}): Promise<QuizListItem[]> {
  const where: string[] = ["q.status = 'published'"];
  const values: unknown[] = [];

  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace("$idx", `$${values.length}`));
  };

  if (params.subjectId) add("q.subject_id = $idx", params.subjectId);
  if (params.difficulty)
    add("q.difficulty = $idx::difficulty_level", params.difficulty);
  if (params.visibility)
    add("q.visibility = $idx::quiz_visibility", params.visibility);
  if (params.topicIds?.length) {
    add(
      "q.id IN (SELECT quiz_id FROM quiz_topics WHERE topic_id = ANY($idx::uuid[]))",
      params.topicIds,
    );
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
    }
  >(
    `SELECT q.*, COALESCE(array_agg(qt.topic_id) FILTER (WHERE qt.topic_id IS NOT NULL), '{}') AS topic_ids
     FROM quizzes q
     LEFT JOIN quiz_topics qt ON qt.quiz_id = q.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY q.id
     ORDER BY q.published_at DESC NULLS LAST, q.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return res.rows.map((row) => ({
    ...mapQuiz(row),
    topicIds: row.topic_ids,
  }));
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
    where.push(sql.replace("$idx", `$${values.length}`));
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

  const res = await query<QuizRow & { topic_ids: string[] }>(
    `SELECT q.*, COALESCE(array_agg(qt.topic_id) FILTER (WHERE qt.topic_id IS NOT NULL), '{}') AS topic_ids
     FROM quizzes q
     LEFT JOIN quiz_topics qt ON qt.quiz_id = q.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY q.id
     ORDER BY q.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return res.rows.map((row) => ({
    ...mapQuiz(row),
    topicIds: row.topic_ids,
  }));
}

async function insertTopics(
  client: PoolClient,
  quizId: string,
  topicIds: string[],
) {
  const values = topicIds.map((_, idx) => `($1, $${idx + 2})`).join(", ");
  await client.query(
    `INSERT INTO quiz_topics (quiz_id, topic_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [quizId, ...topicIds],
  );
}

async function replaceTopics(
  client: PoolClient,
  quizId: string,
  topicIds: string[],
) {
  await client.query(`DELETE FROM quiz_topics WHERE quiz_id = $1`, [quizId]);
  if (topicIds.length) {
    await insertTopics(client, quizId, topicIds);
  }
}

async function upsertChallengeInternal(
  client: PoolClient,
  input: ChallengeSettings,
) {
  await client.query(
    `INSERT INTO challenge_settings (quiz_id, start_at, end_at, time_limit_seconds, rules)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (quiz_id)
     DO UPDATE SET start_at = EXCLUDED.start_at,
                   end_at = EXCLUDED.end_at,
                   time_limit_seconds = EXCLUDED.time_limit_seconds,
                   rules = EXCLUDED.rules`,
    [
      input.quizId,
      input.startAt,
      input.endAt,
      input.timeLimitSeconds,
      input.rules ?? {},
    ],
  );
}
