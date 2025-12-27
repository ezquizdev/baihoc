import { query, withTransaction } from "@/application/infra/db/pool";
import type { DifficultyLevel } from "@/application/models/enums";

type TopicRow = {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
};

type CustomQuizRow = {
  id: string;
  user_id: string;
  status: "pending" | "ready" | "failed";
  config: unknown;
  generated_quiz_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
};

const insertQuizSearchVectorSql =
  "to_tsvector('simple', coalesce($1, '') || ' ' || coalesce($2, ''))";

export async function listTopicsByIds(topicIds: string[]): Promise<TopicRow[]> {
  if (!topicIds.length) return [];
  const res = await query<TopicRow>(
    `SELECT id, subject_id, name, slug
     FROM topics
     WHERE id = ANY($1::uuid[])`,
    [topicIds],
  );
  return res.rows;
}

export async function findCustomQuizByGeneratedQuizId(quizId: string): Promise<{
  id: string;
  userId: string;
  status: CustomQuizRow["status"];
} | null> {
  const res = await query<Pick<CustomQuizRow, "id" | "user_id" | "status">>(
    `SELECT id, user_id, status
     FROM custom_quizzes
     WHERE generated_quiz_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [quizId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return { id: row.id, userId: row.user_id, status: row.status };
}

export async function insertCustomQuizRequest(input: {
  userId: string;
  config: unknown;
}) {
  const res = await query<Pick<CustomQuizRow, "id">>(
    `INSERT INTO custom_quizzes (user_id, status, config)
     VALUES ($1, 'pending'::custom_quiz_status, $2::jsonb)
     RETURNING id`,
    [input.userId, JSON.stringify(input.config)],
  );
  const row = res.rows[0];
  if (!row) throw new Error("Failed to create custom quiz request");
  return { id: row.id };
}

export async function markCustomQuizFailed(
  customQuizId: string,
  message: string,
) {
  await query(
    `UPDATE custom_quizzes
     SET status = 'failed'::custom_quiz_status,
         error_message = $2,
         updated_at = now()
     WHERE id = $1`,
    [customQuizId, message],
  );
}

export async function markCustomQuizReady(input: {
  customQuizId: string;
  generatedQuizId: string;
}) {
  await query(
    `UPDATE custom_quizzes
     SET status = 'ready'::custom_quiz_status,
         generated_quiz_id = $2,
         updated_at = now(),
         ready_at = now()
     WHERE id = $1`,
    [input.customQuizId, input.generatedQuizId],
  );
}

export async function createReadyCustomQuizWithGeneratedQuiz(input: {
  userId: string;
  config: unknown;
  title: string;
  description: string | null;
  difficulty: DifficultyLevel;
  estimatedTimeSeconds: number | null;
  questionIds: string[];
}): Promise<{ customQuizId: string; quizId: string }> {
  if (!input.questionIds.length) {
    throw new Error("questionIds is required");
  }

  return withTransaction(async (client) => {
    const customQuizRes = await client.query<Pick<CustomQuizRow, "id">>(
      `INSERT INTO custom_quizzes (user_id, status, config)
       VALUES ($1, 'pending'::custom_quiz_status, $2::jsonb)
       RETURNING id`,
      [input.userId, JSON.stringify(input.config)],
    );
    const customQuizRow = customQuizRes.rows[0];
    if (!customQuizRow) throw new Error("Failed to create custom quiz request");

    const quizRes = await client.query<{ id: string }>(
      `INSERT INTO quizzes (
        title, description, difficulty_level, visibility, status,
        is_challenge, estimated_time_seconds, featured_rank,
        created_by, published_at, search_vector
      ) VALUES (
        $1, $2, $3,
        'premium'::quiz_visibility,
        'published'::quiz_status,
        false,
        $4,
        NULL,
        $5,
        now(),
        ${insertQuizSearchVectorSql}
      )
      RETURNING id`,
      [
        input.title,
        input.description,
        input.difficulty,
        input.estimatedTimeSeconds,
        input.userId,
      ],
    );
    const quizRow = quizRes.rows[0];
    if (!quizRow) throw new Error("Failed to create quiz");

    const values: string[] = [];
    const params: unknown[] = [quizRow.id];
    input.questionIds.forEach((questionId, index) => {
      const base = index * 4;
      values.push(
        `($1, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      );
      params.push(questionId);
      params.push(index + 1);
      params.push(null);
      params.push(true);
    });

    await client.query(
      `INSERT INTO quiz_questions (quiz_id, question_id, position, score, required)
       VALUES ${values.join(", ")}`,
      params,
    );

    await client.query(
      `UPDATE custom_quizzes
       SET status = 'ready'::custom_quiz_status,
           generated_quiz_id = $2,
           updated_at = now(),
           ready_at = now()
       WHERE id = $1`,
      [customQuizRow.id, quizRow.id],
    );

    return { customQuizId: customQuizRow.id, quizId: quizRow.id };
  });
}

export async function createPublishedQuizWithQuestions(input: {
  title: string;
  description: string | null;
  difficulty: DifficultyLevel;
  estimatedTimeSeconds: number | null;
  createdBy: string;
  questionIds: string[];
}) {
  if (!input.questionIds.length) {
    throw new Error("questionIds is required");
  }

  return withTransaction(async (client) => {
    const quizRes = await client.query<{ id: string }>(
      `INSERT INTO quizzes (
        title, description, difficulty_level, visibility, status,
        is_challenge, estimated_time_seconds, featured_rank,
        created_by, published_at, search_vector
      ) VALUES (
        $1, $2, $3,
        'premium'::quiz_visibility,
        'published'::quiz_status,
        false,
        $4,
        NULL,
        $5,
        now(),
        ${insertQuizSearchVectorSql}
      )
      RETURNING id`,
      [
        input.title,
        input.description,
        input.difficulty,
        input.estimatedTimeSeconds,
        input.createdBy,
      ],
    );
    const quizRow = quizRes.rows[0];
    if (!quizRow) throw new Error("Failed to create quiz");

    const values: string[] = [];
    const params: unknown[] = [quizRow.id];
    input.questionIds.forEach((questionId, index) => {
      const base = index * 4;
      values.push(
        `($1, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      );
      params.push(questionId);
      params.push(index + 1);
      params.push(null);
      params.push(true);
    });

    await client.query(
      `INSERT INTO quiz_questions (quiz_id, question_id, position, score, required)
       VALUES ${values.join(", ")}`,
      params,
    );

    return { quizId: quizRow.id };
  });
}

export async function countActiveQuestionsByTopicAndDifficulty(
  topicIds: string[],
): Promise<
  Array<{ topicId: string; difficulty: DifficultyLevel; count: number }>
> {
  if (!topicIds.length) return [];
  const res = await query<{
    topic_id: string;
    default_difficulty: number;
    cnt: number;
  }>(
    `SELECT qt.topic_id,
            q.default_difficulty,
            COUNT(DISTINCT q.id)::int AS cnt
     FROM question_topics qt
     JOIN questions q ON q.id = qt.question_id
     WHERE qt.topic_id = ANY($1::uuid[])
       AND q.status = 'active'::question_status
     GROUP BY qt.topic_id, q.default_difficulty`,
    [topicIds],
  );
  return res.rows.map((row) => ({
    topicId: row.topic_id,
    difficulty: row.default_difficulty as DifficultyLevel,
    count: Number(row.cnt),
  }));
}

export async function pickQuestionIdsForTopicDifficulty(input: {
  topicId: string;
  difficulty: DifficultyLevel;
  limit: number;
  excludeQuestionIds: string[];
}): Promise<string[]> {
  if (input.limit <= 0) return [];
  const res = await query<{ id: string }>(
    `SELECT q.id
     FROM questions q
     JOIN question_topics qt ON qt.question_id = q.id
     WHERE qt.topic_id = $1
       AND q.status = 'active'::question_status
       AND q.default_difficulty = $2
       AND q.id <> ALL($3::uuid[])
     ORDER BY random()
     LIMIT $4`,
    [input.topicId, input.difficulty, input.excludeQuestionIds, input.limit],
  );
  return res.rows.map((row) => row.id);
}
