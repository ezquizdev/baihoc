import type { PoolClient } from "pg";
import { query, withTransaction } from "@/application/infra/db/pool";
import type {
  Passage,
  Question,
  QuestionDetail,
  QuestionOption,
  QuestionStatus,
  QuestionType,
  ShortAnswerKey,
} from "@/application/models/question";
import type {
  QuestionSortBy,
  QuestionSortDir,
} from "@/application/models/questionList";

export type QuestionRow = {
  id: string;
  subject_id: string;
  default_difficulty: Question["defaultDifficulty"];
  type: QuestionType;
  stem: string;
  explanation: string | null;
  status: QuestionStatus;
  tags: string[];
  default_score: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  topic_ids?: string[] | null;
  passage_id?: string | null;
  passage_position?: number | null;
};

export type OptionRow = {
  id: string;
  question_id: string;
  label: string | null;
  text: string;
  is_correct: boolean;
  position: number;
};

export type ShortAnswerRow = {
  id: string;
  question_id: string;
  acceptable_answer: string;
  case_sensitive: boolean;
};

export type PassageRow = {
  id: string;
  content: string;
};

const searchVectorSql =
  "to_tsvector('simple', coalesce(stem, '') || ' ' || coalesce(explanation, ''))";
const insertSearchVectorSql =
  "to_tsvector('simple', coalesce($4, '') || ' ' || coalesce($5, ''))";

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    subjectId: row.subject_id,
    defaultDifficulty: row.default_difficulty,
    type: row.type,
    stem: row.stem,
    explanation: row.explanation,
    status: row.status,
    tags: row.tags ?? [],
    topicIds: row.topic_ids ?? [],
    defaultScore: Number(row.default_score),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    passageId: row.passage_id ?? null,
    passagePosition: row.passage_position ?? null,
  };
}

function mapOption(row: OptionRow): QuestionOption {
  return {
    id: row.id,
    questionId: row.question_id,
    label: row.label,
    text: row.text,
    isCorrect: row.is_correct,
    position: row.position,
  };
}

function mapShortAnswer(row: ShortAnswerRow): ShortAnswerKey {
  return {
    id: row.id,
    questionId: row.question_id,
    acceptableAnswer: row.acceptable_answer,
    caseSensitive: row.case_sensitive,
  };
}

function mapPassage(row: PassageRow | undefined): Passage | null {
  if (!row) return null;
  return {
    id: row.id,
    content: row.content,
  };
}

export async function insertQuestion(input: {
  subjectId: string;
  defaultDifficulty: Question["defaultDifficulty"];
  type: QuestionType;
  stem: string;
  explanation?: string | null;
  status?: QuestionStatus;
  tags?: string[];
  topicIds?: string[];
  defaultScore?: number;
  createdBy: string;
  options?: Array<Omit<QuestionOption, "id" | "questionId">>;
  shortAnswers?: Array<Omit<ShortAnswerKey, "id" | "questionId">>;
  passage?: { content: string } | null;
  passageId?: string | null;
  passagePosition?: number;
}): Promise<QuestionDetail> {
  return withTransaction(async (client) => {
    const questionRes = await client.query<QuestionRow>(
      `INSERT INTO questions (
        subject_id, default_difficulty, type, stem, explanation, status,
        tags, default_score, created_by, search_vector
      ) VALUES (
        $1, $2, $3::question_type, $4, $5,
        COALESCE($6::question_status, 'active'),
        COALESCE($7::text[], '{}'),
        COALESCE($8, 1),
        $9,
        ${insertSearchVectorSql}
      )
      RETURNING *`,
      [
        input.subjectId,
        input.defaultDifficulty,
        input.type,
        input.stem,
        input.explanation ?? null,
        input.status ?? "active",
        input.tags ?? [],
        input.defaultScore ?? 1,
        input.createdBy,
      ],
    );
    const questionRow = questionRes.rows[0];
    if (!questionRow) {
      throw new Error("Failed to create question");
    }

    if (input.topicIds?.length) {
      await replaceQuestionTopics(client, questionRow.id, input.topicIds);
    }

    let passageRow: PassageRow | undefined;
    let passageId = input.passageId ?? null;
    if (input.passage) {
      const passageRes = await client.query<PassageRow>(
        `INSERT INTO passages (content) VALUES ($1) RETURNING *`,
        [input.passage.content],
      );
      passageRow = passageRes.rows[0];
      passageId = passageRow?.id ?? null;
    }

    if (passageId) {
      await client.query(
        `INSERT INTO question_passages (question_id, passage_id, position)
         VALUES ($1, $2, $3)`,
        [questionRow.id, passageId, input.passagePosition ?? 1],
      );
    }

    const enrichedRow: QuestionRow = {
      ...questionRow,
      topic_ids: input.topicIds ?? [],
      passage_id: passageId,
      passage_position: passageId ? (input.passagePosition ?? 1) : null,
    };

    if (input.options?.length) {
      await insertOptions(client, questionRow.id, input.options);
    }
    if (input.shortAnswers?.length) {
      await insertShortAnswers(client, questionRow.id, input.shortAnswers);
    }

    const [options, answers] = await Promise.all([
      getOptions(client, questionRow.id),
      getShortAnswers(client, questionRow.id),
    ]);

    return {
      question: mapQuestion(enrichedRow),
      options,
      shortAnswerKeys: answers,
      passage: mapPassage(passageRow),
    };
  });
}

export async function updateQuestion(input: {
  questionId: string;
  subjectId?: string;
  defaultDifficulty?: Question["defaultDifficulty"];
  type?: QuestionType;
  stem?: string;
  explanation?: string | null;
  status?: QuestionStatus;
  tags?: string[];
  topicIds?: string[];
  defaultScore?: number;
  options?: Array<Omit<QuestionOption, "id" | "questionId">> | null;
  shortAnswers?: Array<Omit<ShortAnswerKey, "id" | "questionId">> | null;
  passage?: { content: string } | null;
  passageId?: string | null;
  passagePosition?: number;
}): Promise<QuestionDetail | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  const push = (sql: string, value: unknown) => {
    fields.push(sql.replaceAll("$idx", `$${idx}`));
    values.push(value);
    idx += 1;
  };

  if (input.subjectId !== undefined) push("subject_id = $idx", input.subjectId);
  if (input.defaultDifficulty !== undefined)
    push("default_difficulty = $idx", input.defaultDifficulty);
  if (input.type !== undefined) push("type = $idx::question_type", input.type);
  if (input.stem !== undefined) push("stem = $idx", input.stem);
  if (input.explanation !== undefined)
    push("explanation = $idx", input.explanation);
  if (input.status !== undefined)
    push("status = $idx::question_status", input.status);
  if (input.tags !== undefined) push("tags = $idx::text[]", input.tags);
  if (input.defaultScore !== undefined)
    push("default_score = $idx", input.defaultScore);

  if (input.stem !== undefined || input.explanation !== undefined) {
    fields.push(`search_vector = ${searchVectorSql}`);
  }
  fields.push("updated_at = now()");

  const detail = await withTransaction(async (client) => {
    if (fields.length) {
      values.push(input.questionId);
      await client.query(
        `UPDATE questions SET ${fields.join(", ")} WHERE id = $${idx}`,
        values,
      );
    }

    if (input.topicIds !== undefined) {
      await replaceQuestionTopics(client, input.questionId, input.topicIds);
    }

    const wantsPassageRemoval =
      input.passage === null || input.passageId === null;

    if (wantsPassageRemoval) {
      await client.query(
        `DELETE FROM question_passages WHERE question_id = $1`,
        [input.questionId],
      );
    } else if (input.passage || input.passageId) {
      let passageId = input.passageId ?? null;
      if (input.passage) {
        const passageRes = await client.query<PassageRow>(
          `INSERT INTO passages (content)
           VALUES ($1)
           RETURNING *`,
          [input.passage.content],
        );
        const passageRow = passageRes.rows[0];
        passageId = passageRow?.id ?? null;
      }

      if (passageId) {
        await client.query(
          `INSERT INTO question_passages (question_id, passage_id, position)
           VALUES ($1, $2, $3)
           ON CONFLICT (question_id)
           DO UPDATE SET passage_id = EXCLUDED.passage_id,
                         position = EXCLUDED.position`,
          [input.questionId, passageId, input.passagePosition ?? 1],
        );
      }
    } else if (input.passagePosition !== undefined) {
      await client.query(
        `UPDATE question_passages
         SET position = $2
         WHERE question_id = $1`,
        [input.questionId, input.passagePosition],
      );
    }

    if (input.options !== undefined) {
      await client.query(
        `DELETE FROM question_options WHERE question_id = $1`,
        [input.questionId],
      );
      if (input.options) {
        await insertOptions(client, input.questionId, input.options);
      }
    }

    if (input.shortAnswers !== undefined) {
      await client.query(
        `DELETE FROM short_answer_keys WHERE question_id = $1`,
        [input.questionId],
      );
      if (input.shortAnswers) {
        await insertShortAnswers(client, input.questionId, input.shortAnswers);
      }
    }

    const baseQuestion = await client.query<QuestionRow>(
      `SELECT q.*,
              COALESCE(qt.topic_ids, '{}') AS topic_ids,
              qp.passage_id,
              qp.position AS passage_position
       FROM questions q
       LEFT JOIN (
         SELECT question_id, array_agg(topic_id) AS topic_ids
         FROM question_topics
         GROUP BY question_id
       ) qt ON qt.question_id = q.id
       LEFT JOIN question_passages qp ON qp.question_id = q.id
       WHERE q.id = $1`,
      [input.questionId],
    );
    const questionRow = baseQuestion.rows[0];
    if (!questionRow) return null;

    const [options, answers, passage] = await Promise.all([
      getOptions(client, input.questionId),
      getShortAnswers(client, input.questionId),
      getPassage(client, input.questionId),
    ]);

    return {
      question: mapQuestion(questionRow),
      options,
      shortAnswerKeys: answers,
      passage,
    };
  });

  return detail;
}

export async function listQuestions(params: {
  subjectIds?: string[];
  difficultyLevels?: Question["defaultDifficulty"][];
  types?: QuestionType[];
  statuses?: QuestionStatus[];
  hasPassage?: boolean;
  search?: string;
  sortBy?: QuestionSortBy;
  sortDir?: QuestionSortDir;
  limit?: number;
  offset?: number;
}): Promise<Question[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  if (params.subjectIds?.length)
    add("q.subject_id = ANY($idx::uuid[])", params.subjectIds);
  if (params.difficultyLevels?.length)
    add("q.default_difficulty = ANY($idx::int[])", params.difficultyLevels);
  if (params.types?.length)
    add("q.type = ANY($idx::question_type[])", params.types);
  if (params.statuses?.length)
    add("q.status = ANY($idx::question_status[])", params.statuses);
  if (params.hasPassage === true) where.push("qp.passage_id IS NOT NULL");
  if (params.hasPassage === false) where.push("qp.passage_id IS NULL");
  if (params.search) {
    add("(stem ILIKE $idx OR explanation ILIKE $idx)", `%${params.search}%`);
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  values.push(limit);
  values.push(offset);

  const sortColumns: Record<QuestionSortBy, string> = {
    createdAt: "q.created_at",
    difficulty: "q.default_difficulty",
    status: "q.status",
    stem: "q.stem",
    subject: "s.name",
    type: "q.type",
    updatedAt: "q.updated_at",
  };
  const sortBy = params.sortBy ?? "createdAt";
  const sortDir = params.sortDir ?? "desc";
  const sortColumn = sortColumns[sortBy];

  const res = await query<QuestionRow>(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            qp.passage_id,
            qp.position AS passage_position
     FROM questions q
     JOIN subjects s ON s.id = q.subject_id
     LEFT JOIN (
       SELECT question_id, array_agg(topic_id) AS topic_ids
       FROM question_topics
       GROUP BY question_id
     ) qt ON qt.question_id = q.id
     LEFT JOIN question_passages qp ON qp.question_id = q.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${sortColumn} ${sortDir}, q.id ASC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return res.rows.map(mapQuestion);
}

export async function countQuestions(params: {
  subjectIds?: string[];
  difficultyLevels?: Question["defaultDifficulty"][];
  types?: QuestionType[];
  statuses?: QuestionStatus[];
  hasPassage?: boolean;
  search?: string;
}): Promise<number> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replaceAll("$idx", `$${values.length}`));
  };

  if (params.subjectIds?.length)
    add("subject_id = ANY($idx::uuid[])", params.subjectIds);
  if (params.difficultyLevels?.length)
    add("default_difficulty = ANY($idx::int[])", params.difficultyLevels);
  if (params.types?.length)
    add("type = ANY($idx::question_type[])", params.types);
  if (params.statuses?.length)
    add("status = ANY($idx::question_status[])", params.statuses);
  if (params.hasPassage === true) {
    where.push(
      "EXISTS (SELECT 1 FROM question_passages qp WHERE qp.question_id = questions.id)",
    );
  }
  if (params.hasPassage === false) {
    where.push(
      "NOT EXISTS (SELECT 1 FROM question_passages qp WHERE qp.question_id = questions.id)",
    );
  }
  if (params.search) {
    add("(stem ILIKE $idx OR explanation ILIKE $idx)", `%${params.search}%`);
  }

  const res = await query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt
     FROM questions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
    values,
  );
  return Number(res.rows[0]?.cnt ?? 0);
}

export async function getQuestionDetail(
  questionId: string,
): Promise<QuestionDetail | null> {
  const questionRes = await query<QuestionRow>(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            qp.passage_id,
            qp.position AS passage_position
     FROM questions q
     LEFT JOIN (
       SELECT question_id, array_agg(topic_id) AS topic_ids
       FROM question_topics
       GROUP BY question_id
     ) qt ON qt.question_id = q.id
     LEFT JOIN question_passages qp ON qp.question_id = q.id
     WHERE q.id = $1`,
    [questionId],
  );
  const row = questionRes.rows[0];
  if (!row) return null;
  const [options, answers, passage] = await Promise.all([
    getOptions(undefined, questionId),
    getShortAnswers(undefined, questionId),
    getPassage(undefined, questionId),
  ]);
  return {
    question: mapQuestion(row),
    options,
    shortAnswerKeys: answers,
    passage,
  };
}

export async function getPassageById(
  passageId: string,
): Promise<Passage | null> {
  const res = await query<PassageRow>(
    `SELECT id, content
     FROM passages
     WHERE id = $1`,
    [passageId],
  );
  return mapPassage(res.rows[0]);
}

export async function updatePassageById(input: {
  passageId: string;
  content: string;
}): Promise<Passage | null> {
  const res = await query<PassageRow>(
    `UPDATE passages
     SET content = $2
     WHERE id = $1
     RETURNING id, content`,
    [input.passageId, input.content],
  );
  return mapPassage(res.rows[0]);
}

export async function insertPassage(content: string): Promise<Passage> {
  const res = await query<PassageRow>(
    `INSERT INTO passages (content)
     VALUES ($1)
     RETURNING id, content`,
    [content],
  );
  const passage = mapPassage(res.rows[0]);
  if (!passage) {
    throw new Error("Failed to create passage");
  }
  return passage;
}

export async function listUsedQuestionIdsInQuizzes(questionIds: string[]) {
  if (!questionIds.length) return [];
  const res = await query<{ question_id: string }>(
    `SELECT DISTINCT question_id
     FROM quiz_questions
     WHERE question_id = ANY($1::uuid[])`,
    [questionIds],
  );
  return res.rows.map((row) => row.question_id);
}

export async function deletePassageCascade(passageId: string) {
  await withTransaction(async (client) => {
    const questionRes = await client.query<{ question_id: string }>(
      `SELECT question_id
       FROM question_passages
       WHERE passage_id = $1`,
      [passageId],
    );
    const questionIds = questionRes.rows.map((row) => row.question_id);

    if (questionIds.length) {
      await client.query(
        `DELETE FROM question_options
         WHERE question_id = ANY($1::uuid[])`,
        [questionIds],
      );
      await client.query(
        `DELETE FROM short_answer_keys
         WHERE question_id = ANY($1::uuid[])`,
        [questionIds],
      );
      await client.query(
        `DELETE FROM question_topics
         WHERE question_id = ANY($1::uuid[])`,
        [questionIds],
      );
    }

    await client.query(`DELETE FROM question_passages WHERE passage_id = $1`, [
      passageId,
    ]);

    if (questionIds.length) {
      await client.query(`DELETE FROM questions WHERE id = ANY($1::uuid[])`, [
        questionIds,
      ]);
    }

    await client.query(`DELETE FROM passages WHERE id = $1`, [passageId]);
  });
}

export async function listQuestionsForPassage(
  passageId: string,
): Promise<Question[]> {
  const res = await query<QuestionRow>(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            qp.passage_id,
            qp.position AS passage_position
     FROM question_passages qp
     JOIN questions q ON q.id = qp.question_id
     LEFT JOIN (
       SELECT question_id, array_agg(topic_id) AS topic_ids
       FROM question_topics
       GROUP BY question_id
     ) qt ON qt.question_id = q.id
     WHERE qp.passage_id = $1
     ORDER BY qp.position ASC, q.id ASC`,
    [passageId],
  );
  return res.rows.map(mapQuestion);
}

export async function archiveQuestion(questionId: string) {
  await query(
    `UPDATE questions
     SET status = 'archived', archived_at = now(), updated_at = now()
     WHERE id = $1`,
    [questionId],
  );
}

export async function isQuestionUsed(questionId: string) {
  const res = await query<{ cnt: string }>(
    `SELECT COUNT(*)::int AS cnt FROM quiz_questions WHERE question_id = $1`,
    [questionId],
  );
  return Number(res.rows[0]?.cnt ?? 0) > 0;
}

export async function hasInProgressAttemptsForQuestion(questionId: string) {
  const res = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1
      FROM quiz_questions qq
      JOIN attempts a ON a.quiz_id = qq.quiz_id
      WHERE qq.question_id = $1
        AND a.status = 'in_progress'
      LIMIT 1
    ) AS exists`,
    [questionId],
  );
  return Boolean(res.rows[0]?.exists);
}

export async function hasInProgressAttemptsForPassage(passageId: string) {
  const res = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1
      FROM question_passages qp
      JOIN quiz_questions qq ON qq.question_id = qp.question_id
      JOIN attempts a ON a.quiz_id = qq.quiz_id
      WHERE qp.passage_id = $1
        AND a.status = 'in_progress'
      LIMIT 1
    ) AS exists`,
    [passageId],
  );
  return Boolean(res.rows[0]?.exists);
}

export async function listQuestionIdsByIds(questionIds: string[]) {
  if (!questionIds.length) return [];
  const res = await query<{ id: string }>(
    `SELECT id
     FROM questions
     WHERE id = ANY($1::uuid[])`,
    [questionIds],
  );
  return res.rows.map((row) => row.id);
}

export async function listQuestionsByIds(questionIds: string[]) {
  if (!questionIds.length) return [];
  const res = await query<QuestionRow>(
    `SELECT q.*,
            COALESCE(qt.topic_ids, '{}') AS topic_ids,
            qp.passage_id,
            qp.position AS passage_position
     FROM questions q
     LEFT JOIN (
       SELECT question_id, array_agg(topic_id) AS topic_ids
       FROM question_topics
       GROUP BY question_id
     ) qt ON qt.question_id = q.id
     LEFT JOIN question_passages qp ON qp.question_id = q.id
     WHERE q.id = ANY($1::uuid[])
     ORDER BY q.created_at DESC, q.id ASC`,
    [questionIds],
  );
  return res.rows.map(mapQuestion);
}

export async function deleteQuestion(questionId: string) {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM question_options WHERE question_id = $1`, [
      questionId,
    ]);
    await client.query(`DELETE FROM short_answer_keys WHERE question_id = $1`, [
      questionId,
    ]);
    await client.query(`DELETE FROM question_topics WHERE question_id = $1`, [
      questionId,
    ]);
    const passage = await client.query<{ passage_id: string }>(
      `SELECT passage_id FROM question_passages WHERE question_id = $1`,
      [questionId],
    );
    await client.query(`DELETE FROM question_passages WHERE question_id = $1`, [
      questionId,
    ]);
    if (passage.rows[0]) {
      const usage = await client.query<{ cnt: string }>(
        `SELECT COUNT(*)::int AS cnt
         FROM question_passages
         WHERE passage_id = $1`,
        [passage.rows[0].passage_id],
      );
      if (Number(usage.rows[0]?.cnt ?? 0) === 0) {
        await client.query(`DELETE FROM passages WHERE id = $1`, [
          passage.rows[0].passage_id,
        ]);
      }
    }
    await client.query(`DELETE FROM questions WHERE id = $1`, [questionId]);
  });
}

async function insertOptions(
  client: PoolClient,
  questionId: string,
  options: Array<Omit<QuestionOption, "id" | "questionId">>,
) {
  const values: string[] = [];
  const params: unknown[] = [];
  options.forEach((opt, idx) => {
    const base = idx * 4;
    values.push(`($1, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    params.push(opt.label ?? null);
    params.push(opt.text);
    params.push(opt.isCorrect);
    params.push(opt.position);
  });
  await client.query(
    `INSERT INTO question_options
     (question_id, label, text, is_correct, position)
     VALUES ${values.join(", ")}`,
    [questionId, ...params],
  );
}

async function insertShortAnswers(
  client: PoolClient,
  questionId: string,
  answers: Array<Omit<ShortAnswerKey, "id" | "questionId">>,
) {
  const values: string[] = [];
  const params: unknown[] = [];
  answers.forEach((ans, idx) => {
    const base = idx * 2;
    values.push(`($1, $${base + 2}, $${base + 3})`);
    params.push(ans.acceptableAnswer);
    params.push(ans.caseSensitive);
  });
  await client.query(
    `INSERT INTO short_answer_keys (question_id, acceptable_answer, case_sensitive)
     VALUES ${values.join(", ")}`,
    [questionId, ...params],
  );
}

async function replaceQuestionTopics(
  client: PoolClient,
  questionId: string,
  topicIds: string[],
) {
  await client.query(`DELETE FROM question_topics WHERE question_id = $1`, [
    questionId,
  ]);
  if (!topicIds.length) return;
  const values = topicIds.map((_, idx) => `($1, $${idx + 2})`).join(", ");
  await client.query(
    `INSERT INTO question_topics (question_id, topic_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [questionId, ...topicIds],
  );
}

async function getOptions(client: PoolClient | undefined, questionId: string) {
  if (client) {
    const res = await client.query<OptionRow>(
      `SELECT * FROM question_options WHERE question_id = $1 ORDER BY position`,
      [questionId],
    );
    return res.rows.map(mapOption);
  }
  const res = await query<OptionRow>(
    `SELECT * FROM question_options WHERE question_id = $1 ORDER BY position`,
    [questionId],
  );
  return res.rows.map(mapOption);
}

async function getShortAnswers(
  client: PoolClient | undefined,
  questionId: string,
) {
  if (client) {
    const res = await client.query<ShortAnswerRow>(
      `SELECT * FROM short_answer_keys WHERE question_id = $1`,
      [questionId],
    );
    return res.rows.map(mapShortAnswer);
  }
  const res = await query<ShortAnswerRow>(
    `SELECT * FROM short_answer_keys WHERE question_id = $1`,
    [questionId],
  );
  return res.rows.map(mapShortAnswer);
}

async function getPassage(client: PoolClient | undefined, questionId: string) {
  if (client) {
    const res = await client.query<PassageRow>(
      `SELECT p.*
       FROM passages p
       JOIN question_passages qp ON qp.passage_id = p.id
       WHERE qp.question_id = $1
       LIMIT 1`,
      [questionId],
    );
    return mapPassage(res.rows[0]);
  }
  const res = await query<PassageRow>(
    `SELECT p.*
     FROM passages p
     JOIN question_passages qp ON qp.passage_id = p.id
     WHERE qp.question_id = $1
     LIMIT 1`,
    [questionId],
  );
  return mapPassage(res.rows[0]);
}
