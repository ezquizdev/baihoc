import {
  countActiveQuestionsByTopicAndDifficulty,
  createReadyCustomQuizWithGeneratedQuiz,
  listTopicsByIds,
  pickQuestionIdsForTopicDifficulty,
} from "@/application/infra/db/customQuizRepo";
import { findUserById } from "@/application/infra/db/userRepo";
import type { DifficultyLevel } from "@/application/models/enums";
import { ServiceError } from "@/application/services/errors";

export type GenerateCustomQuizInput = {
  title?: string | null;
  difficulty: DifficultyLevel;
  questionCount: number;
  durationSeconds?: number | null;
  topicsBySubject: Array<{
    subjectId: string;
    topicIds: string[];
  }>;
};

export type GenerateCustomQuizResult = {
  customQuizId: string;
  quizId: string;
};

type TopicMeta = {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
};

type TopicDifficultyBucket = {
  topicId: string;
  topicName: string;
  difficulty: DifficultyLevel;
  required: number;
  available: number;
};

const difficultyMatrices: Record<DifficultyLevel, number[]> = {
  1: [0.65, 0.25, 0.1, 0, 0],
  2: [0.35, 0.35, 0.2, 0.1, 0],
  3: [0.15, 0.25, 0.3, 0.2, 0.1],
  4: [0.05, 0.15, 0.25, 0.3, 0.25],
  5: [0, 0.05, 0.15, 0.35, 0.45],
};

export function computeDifficultyCounts(
  quizDifficulty: DifficultyLevel,
  totalQuestions: number,
): Record<DifficultyLevel, number> {
  const matrix = difficultyMatrices[quizDifficulty];
  if (!matrix) {
    throw new Error(`Unsupported quiz difficulty: ${quizDifficulty}`);
  }
  if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
    throw new Error("totalQuestions must be a positive integer");
  }

  const raw = matrix.map((p) => p * totalQuestions);
  const base = raw.map((value) => Math.floor(value));
  let remaining = totalQuestions - base.reduce((sum, n) => sum + n, 0);

  const fractional = raw
    .map((value, index) => ({
      index,
      fraction: value - (base[index] ?? 0),
    }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < fractional.length && remaining > 0; i += 1) {
    const current = fractional[i];
    if (!current) continue;
    const idx = current.index;
    base[idx] = (base[idx] ?? 0) + 1;
    remaining -= 1;
  }

  return {
    1: base[0] ?? 0,
    2: base[1] ?? 0,
    3: base[2] ?? 0,
    4: base[3] ?? 0,
    5: base[4] ?? 0,
  };
}

export async function generateCustomQuiz(
  userId: string,
  input: GenerateCustomQuizInput,
): Promise<GenerateCustomQuizResult> {
  validateInput(input);
  await requirePaidTier(userId);

  const { topics, topicIds } = await resolveAndValidateTopics(
    input.topicsBySubject,
  );
  if (!topicIds.length) {
    throw new ServiceError(
      "TOPICS_REQUIRED",
      "At least one topic is required",
      400,
    );
  }

  const difficultyCounts = computeDifficultyCounts(
    input.difficulty,
    input.questionCount,
  );
  const topicOrder = shuffledCopy(topicIds);
  const buckets = await buildSelectionPlan({
    topics,
    topicOrder,
    difficultyCounts,
  });

  const selectedQuestionIds = await selectQuestions(buckets);
  if (selectedQuestionIds.length !== input.questionCount) {
    throw new Error("Question selection failed to match questionCount");
  }

  const normalizedDuration =
    input.durationSeconds && input.durationSeconds > 0
      ? Math.round(input.durationSeconds)
      : null;

  const config = {
    title: normalizeTitle(input.title),
    difficulty: input.difficulty,
    questionCount: input.questionCount,
    durationSeconds: normalizedDuration,
    topicsBySubject: input.topicsBySubject,
    computed: {
      difficultyCounts,
      topicIds: topicOrder,
    },
  };

  const title =
    normalizeTitle(input.title) ??
    `Quiz tuỳ chỉnh (${input.questionCount} câu, ${input.difficulty}★)`;
  const description = `Quiz tuỳ chỉnh theo chủ đề • ${topicIds.length} chủ đề`;
  const shuffledQuestions = shuffledCopy(selectedQuestionIds);

  try {
    return await createReadyCustomQuizWithGeneratedQuiz({
      userId,
      config,
      title,
      description,
      difficulty: input.difficulty,
      estimatedTimeSeconds: normalizedDuration,
      questionIds: shuffledQuestions,
    });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      "CUSTOM_QUIZ_GENERATION_FAILED",
      "Không thể tạo quiz tuỳ chỉnh",
      500,
    );
  }
}

function validateInput(input: GenerateCustomQuizInput) {
  if (input.title !== undefined && input.title !== null) {
    const trimmed = input.title.trim();
    if (!trimmed) {
      throw new ServiceError("TITLE_INVALID", "title must not be empty", 400);
    }
    if (trimmed.length > 120) {
      throw new ServiceError("TITLE_TOO_LONG", "title too long", 400);
    }
  }
  if (
    !Number.isInteger(input.difficulty) ||
    input.difficulty < 1 ||
    input.difficulty > 5
  ) {
    throw new ServiceError(
      "DIFFICULTY_INVALID",
      "difficulty must be an integer from 1 to 5",
      400,
    );
  }
  if (!Number.isInteger(input.questionCount) || input.questionCount <= 0) {
    throw new ServiceError(
      "QUESTION_COUNT_INVALID",
      "questionCount must be a positive integer",
      400,
    );
  }
  if (input.questionCount > 100) {
    throw new ServiceError(
      "QUESTION_COUNT_TOO_LARGE",
      "questionCount too large",
      400,
    );
  }
  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 0) {
      throw new ServiceError(
        "DURATION_INVALID",
        "durationSeconds must be >= 0",
        400,
      );
    }
  }
  if (!input.topicsBySubject?.length) {
    throw new ServiceError(
      "TOPICS_REQUIRED",
      "topicsBySubject is required",
      400,
    );
  }
}

function normalizeTitle(title: string | null | undefined) {
  if (!title) return null;
  const trimmed = title.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

async function requirePaidTier(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ServiceError("USER_NOT_FOUND", "User not found", 404);
  }
  if (user.tier !== "paid") {
    throw new ServiceError(
      "PREMIUM_REQUIRED",
      "Tính năng này chỉ dành cho tài khoản Premium.",
      403,
    );
  }
}

async function resolveAndValidateTopics(
  topicsBySubject: GenerateCustomQuizInput["topicsBySubject"],
): Promise<{ topics: TopicMeta[]; topicIds: string[] }> {
  const requested = new Map<string, string>();
  const allTopicIds: string[] = [];

  for (const selection of topicsBySubject) {
    for (const topicId of selection.topicIds) {
      const existing = requested.get(topicId);
      if (existing && existing !== selection.subjectId) {
        throw new ServiceError(
          "TOPIC_SUBJECT_CONFLICT",
          "A topicId was provided under multiple subjects",
          400,
        );
      }
      requested.set(topicId, selection.subjectId);
      allTopicIds.push(topicId);
    }
  }

  const uniqueTopicIds = Array.from(new Set(allTopicIds));
  const rows = await listTopicsByIds(uniqueTopicIds);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const missing = uniqueTopicIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new ServiceError(
      "TOPICS_NOT_FOUND",
      `Topics not found: ${missing.join(", ")}`,
      400,
    );
  }

  const topics: TopicMeta[] = uniqueTopicIds.map((id) => {
    const row = byId.get(id);
    if (!row) {
      throw new Error("Topic lookup failed");
    }
    const expectedSubject = requested.get(id);
    if (expectedSubject && row.subject_id !== expectedSubject) {
      throw new ServiceError(
        "TOPIC_SUBJECT_MISMATCH",
        "A topicId does not belong to the provided subjectId",
        400,
      );
    }
    return {
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      slug: row.slug,
    };
  });

  return { topics, topicIds: uniqueTopicIds };
}

async function buildSelectionPlan(input: {
  topics: TopicMeta[];
  topicOrder: string[];
  difficultyCounts: Record<DifficultyLevel, number>;
}): Promise<TopicDifficultyBucket[]> {
  const { topics, topicOrder, difficultyCounts } = input;
  const topicMetaById = new Map(topics.map((t) => [t.id, t]));

  const requiredByTopicDifficulty = new Map<
    string,
    Map<DifficultyLevel, number>
  >();
  const topicCount = topicOrder.length;

  const difficultyLevels: DifficultyLevel[] = [1, 2, 3, 4, 5];
  for (const difficulty of difficultyLevels) {
    const target = difficultyCounts[difficulty] ?? 0;
    if (target <= 0) continue;
    const base = Math.floor(target / topicCount);
    const remainder = target % topicCount;
    topicOrder.forEach((topicId, index) => {
      const want = base + (index < remainder ? 1 : 0);
      if (want <= 0) return;
      const byDifficulty =
        requiredByTopicDifficulty.get(topicId) ??
        new Map<DifficultyLevel, number>();
      byDifficulty.set(difficulty, (byDifficulty.get(difficulty) ?? 0) + want);
      requiredByTopicDifficulty.set(topicId, byDifficulty);
    });
  }

  const counts = await countActiveQuestionsByTopicAndDifficulty(topicOrder);
  const available = new Map<string, Map<DifficultyLevel, number>>();
  counts.forEach((row) => {
    const byDifficulty =
      available.get(row.topicId) ?? new Map<DifficultyLevel, number>();
    byDifficulty.set(row.difficulty, row.count);
    available.set(row.topicId, byDifficulty);
  });

  const buckets: TopicDifficultyBucket[] = [];
  for (const topicId of topicOrder) {
    const meta = topicMetaById.get(topicId);
    if (!meta) continue;
    const needed = requiredByTopicDifficulty.get(topicId);
    if (!needed) continue;
    for (const [difficulty, requiredCount] of needed.entries()) {
      const availableCount = available.get(topicId)?.get(difficulty) ?? 0;
      if (availableCount < requiredCount) {
        throw new ServiceError(
          "QUESTION_BANK_INSUFFICIENT",
          `Không đủ câu hỏi cho chủ đề "${meta.name}" (độ khó ${difficulty})`,
          409,
        );
      }
      buckets.push({
        topicId,
        topicName: meta.name,
        difficulty,
        required: requiredCount,
        available: availableCount,
      });
    }
  }

  return buckets.sort((a, b) => {
    const slackA = a.available - a.required;
    const slackB = b.available - b.required;
    if (slackA !== slackB) return slackA - slackB;
    if (a.available !== b.available) return a.available - b.available;
    return b.difficulty - a.difficulty;
  });
}

async function selectQuestions(buckets: TopicDifficultyBucket[]) {
  const selected: string[] = [];
  const selectedSet = new Set<string>();

  for (const bucket of buckets) {
    const picked = await pickQuestionIdsForTopicDifficulty({
      topicId: bucket.topicId,
      difficulty: bucket.difficulty,
      limit: bucket.required,
      excludeQuestionIds: selected,
    });
    if (picked.length !== bucket.required) {
      throw new ServiceError(
        "QUESTION_BANK_INSUFFICIENT",
        `Không đủ câu hỏi (unique) cho chủ đề "${bucket.topicName}" (độ khó ${bucket.difficulty})`,
        409,
      );
    }
    for (const id of picked) {
      if (selectedSet.has(id)) continue;
      selectedSet.add(id);
      selected.push(id);
    }
  }

  return selected;
}

function shuffledCopy<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
