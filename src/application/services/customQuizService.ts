import {
  createReadyCustomQuizWithGeneratedQuiz,
  listEligibleQuestionsForCustomQuiz,
  listTopicsByIds,
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

  const eligibleQuestions = await listEligibleQuestionsForCustomQuiz(topicIds);

  const difficultyCounts = computeDifficultyCounts(
    input.difficulty,
    input.questionCount,
  );
  const topicOrder = shuffledCopy(topicIds);
  const availableByTopicDifficulty =
    countAvailableByTopicDifficulty(eligibleQuestions);
  const buckets = buildSelectionPlan({
    topics,
    topicOrder,
    difficultyCounts,
    availableByTopicDifficulty,
  });

  const questionIds = selectQuestionIdsAtomic({
    eligibleQuestions,
    buckets,
    difficultyCounts,
    questionCount: input.questionCount,
  });

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

  try {
    return await createReadyCustomQuizWithGeneratedQuiz({
      userId,
      config,
      title,
      description,
      difficulty: input.difficulty,
      estimatedTimeSeconds: normalizedDuration,
      questionIds,
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

function buildSelectionPlan(input: {
  topics: TopicMeta[];
  topicOrder: string[];
  difficultyCounts: Record<DifficultyLevel, number>;
  availableByTopicDifficulty: Map<string, Map<DifficultyLevel, number>>;
}): TopicDifficultyBucket[] {
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

  const buckets: TopicDifficultyBucket[] = [];
  for (const topicId of topicOrder) {
    const meta = topicMetaById.get(topicId);
    if (!meta) continue;
    const needed = requiredByTopicDifficulty.get(topicId);
    if (!needed) continue;
    for (const [difficulty, requiredCount] of needed.entries()) {
      const availableCount =
        input.availableByTopicDifficulty.get(topicId)?.get(difficulty) ?? 0;
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

type EligibleQuestion = {
  id: string;
  difficulty: DifficultyLevel;
  topicIds: string[];
  passageId: string | null;
  passagePosition: number | null;
};

type QuestionGroup = {
  groupId: string;
  kind: "single" | "passage";
  questions: Array<Pick<EligibleQuestion, "id" | "difficulty" | "topicIds">>;
};

type BucketAssignment = {
  questionId: string;
  topicId: string;
  difficulty: DifficultyLevel;
};

function countAvailableByTopicDifficulty(
  questions: EligibleQuestion[],
): Map<string, Map<DifficultyLevel, number>> {
  const counts = new Map<string, Map<DifficultyLevel, number>>();
  for (const question of questions) {
    for (const topicId of question.topicIds) {
      const byDifficulty =
        counts.get(topicId) ?? new Map<DifficultyLevel, number>();
      byDifficulty.set(
        question.difficulty,
        (byDifficulty.get(question.difficulty) ?? 0) + 1,
      );
      counts.set(topicId, byDifficulty);
    }
  }
  return counts;
}

function selectQuestionIdsAtomic(input: {
  eligibleQuestions: EligibleQuestion[];
  buckets: TopicDifficultyBucket[];
  difficultyCounts: Record<DifficultyLevel, number>;
  questionCount: number;
}): string[] {
  const groups = buildQuestionGroups(input.eligibleQuestions);

  const strict = selectGroupsStrictByTopicDifficulty({
    groups,
    buckets: input.buckets,
    maxAttempts: 25,
  });
  const selectedGroups =
    strict ??
    selectGroupsByDifficultyOnly({
      groups,
      difficultyCounts: input.difficultyCounts,
      maxAttempts: 25,
    });

  if (!selectedGroups) {
    throw new ServiceError(
      "QUESTION_BANK_INSUFFICIENT",
      "Không đủ câu hỏi để tạo quiz tuỳ chỉnh với cấu hình hiện tại.",
      409,
    );
  }

  const totalQuestions = selectedGroups.reduce(
    (sum, group) => sum + group.questions.length,
    0,
  );
  if (totalQuestions !== input.questionCount) {
    throw new Error("Question selection failed to match questionCount");
  }

  const orderedGroups = shuffledCopy(selectedGroups);
  return orderedGroups.flatMap((group) => group.questions.map((q) => q.id));
}

function buildQuestionGroups(questions: EligibleQuestion[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  const passageMap = new Map<string, EligibleQuestion[]>();

  for (const question of questions) {
    if (question.passageId) {
      const list = passageMap.get(question.passageId) ?? [];
      list.push(question);
      passageMap.set(question.passageId, list);
      continue;
    }
    groups.push({
      groupId: question.id,
      kind: "single",
      questions: [
        {
          id: question.id,
          difficulty: question.difficulty,
          topicIds: question.topicIds,
        },
      ],
    });
  }

  for (const [passageId, list] of passageMap.entries()) {
    const ordered = [...list].sort((a, b) => {
      const posA = a.passagePosition ?? 0;
      const posB = b.passagePosition ?? 0;
      if (posA !== posB) return posA - posB;
      return a.id.localeCompare(b.id);
    });
    groups.push({
      groupId: passageId,
      kind: "passage",
      questions: ordered.map((question) => ({
        id: question.id,
        difficulty: question.difficulty,
        topicIds: question.topicIds,
      })),
    });
  }

  return groups;
}

function selectGroupsStrictByTopicDifficulty(input: {
  groups: QuestionGroup[];
  buckets: TopicDifficultyBucket[];
  maxAttempts: number;
}): QuestionGroup[] | null {
  const required = new Map<string, number>();
  for (const bucket of input.buckets) {
    required.set(bucketKey(bucket.topicId, bucket.difficulty), bucket.required);
  }

  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
    const remaining = new Map(required);
    const selectedGroupIds = new Set<string>();
    const selectedGroups: QuestionGroup[] = [];
    const pool = shuffledCopy(input.groups);

    let ok = true;
    for (const bucket of input.buckets) {
      const targetKey = bucketKey(bucket.topicId, bucket.difficulty);
      while ((remaining.get(targetKey) ?? 0) > 0) {
        const picked = pickNextGroupStrict({
          pool,
          selectedGroupIds,
          remaining,
          target: { topicId: bucket.topicId, difficulty: bucket.difficulty },
        });
        if (!picked) {
          ok = false;
          break;
        }
        selectedGroupIds.add(picked.group.groupId);
        selectedGroups.push(picked.group);
        for (const assignment of picked.assignments) {
          const key = bucketKey(assignment.topicId, assignment.difficulty);
          remaining.set(key, (remaining.get(key) ?? 0) - 1);
        }
      }
      if (!ok) break;
    }

    if (!ok) continue;
    const remainingTotal = Array.from(remaining.values()).reduce(
      (sum, value) => sum + Math.max(0, value),
      0,
    );
    if (remainingTotal !== 0) continue;
    return selectedGroups;
  }

  return null;
}

function pickNextGroupStrict(input: {
  pool: QuestionGroup[];
  selectedGroupIds: Set<string>;
  remaining: Map<string, number>;
  target: { topicId: string; difficulty: DifficultyLevel };
}): { group: QuestionGroup; assignments: BucketAssignment[] } | null {
  for (const group of input.pool) {
    if (input.selectedGroupIds.has(group.groupId)) continue;
    if (!groupHasBucket(group, input.target)) continue;
    const assignments = tryAssignGroupStrict({
      group,
      remaining: input.remaining,
      target: input.target,
    });
    if (!assignments) continue;
    return { group, assignments };
  }
  return null;
}

function tryAssignGroupStrict(input: {
  group: QuestionGroup;
  remaining: Map<string, number>;
  target: { topicId: string; difficulty: DifficultyLevel };
}): BucketAssignment[] | null {
  const remainingTarget =
    input.remaining.get(
      bucketKey(input.target.topicId, input.target.difficulty),
    ) ?? 0;
  if (remainingTarget <= 0) return null;

  const candidates = shuffledCopy(
    input.group.questions
      .map((question, index) => ({ question, index }))
      .filter(
        ({ question }) =>
          question.difficulty === input.target.difficulty &&
          question.topicIds.includes(input.target.topicId),
      ),
  );
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    const remaining = new Map(input.remaining);
    const assignments: BucketAssignment[] = [];

    assignments.push({
      questionId: candidate.question.id,
      topicId: input.target.topicId,
      difficulty: input.target.difficulty,
    });
    remaining.set(
      bucketKey(input.target.topicId, input.target.difficulty),
      (remaining.get(
        bucketKey(input.target.topicId, input.target.difficulty),
      ) ?? 0) - 1,
    );

    const rest = input.group.questions
      .filter((_, index) => index !== candidate.index)
      .sort((a, b) => a.topicIds.length - b.topicIds.length);

    let failed = false;
    for (const item of rest) {
      const options = item.topicIds
        .map((topicId) => ({
          topicId,
          remaining: remaining.get(bucketKey(topicId, item.difficulty)) ?? 0,
        }))
        .filter((option) => option.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);
      const picked = options[0];
      if (!picked) {
        failed = true;
        break;
      }
      assignments.push({
        questionId: item.id,
        topicId: picked.topicId,
        difficulty: item.difficulty,
      });
      const key = bucketKey(picked.topicId, item.difficulty);
      remaining.set(key, (remaining.get(key) ?? 0) - 1);
    }

    if (failed) continue;
    if (assignments.length !== input.group.questions.length) continue;
    return assignments;
  }

  return null;
}

function groupHasBucket(
  group: QuestionGroup,
  target: { topicId: string; difficulty: DifficultyLevel },
) {
  return group.questions.some(
    (question) =>
      question.difficulty === target.difficulty &&
      question.topicIds.includes(target.topicId),
  );
}

function bucketKey(topicId: string, difficulty: DifficultyLevel) {
  return `${topicId}:${difficulty}`;
}

function selectGroupsByDifficultyOnly(input: {
  groups: QuestionGroup[];
  difficultyCounts: Record<DifficultyLevel, number>;
  maxAttempts: number;
}): QuestionGroup[] | null {
  const required = new Map<DifficultyLevel, number>();
  const difficultyLevels: DifficultyLevel[] = [1, 2, 3, 4, 5];
  for (const difficulty of difficultyLevels) {
    required.set(difficulty, input.difficultyCounts[difficulty] ?? 0);
  }

  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
    const remaining = new Map(required);
    const selectedGroupIds = new Set<string>();
    const selectedGroups: QuestionGroup[] = [];
    const pool = shuffledCopy(input.groups);

    let remainingTotal = Array.from(remaining.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    let ok = true;
    while (remainingTotal > 0) {
      const candidate = pool.find((group) => {
        if (selectedGroupIds.has(group.groupId)) return false;
        if (group.questions.length > remainingTotal) return false;
        const counts = countGroupDifficulties(group);
        for (const [difficulty, count] of counts.entries()) {
          const available = remaining.get(difficulty) ?? 0;
          if (count > available) return false;
        }
        return true;
      });

      if (!candidate) {
        ok = false;
        break;
      }

      selectedGroupIds.add(candidate.groupId);
      selectedGroups.push(candidate);
      const counts = countGroupDifficulties(candidate);
      for (const [difficulty, count] of counts.entries()) {
        remaining.set(difficulty, (remaining.get(difficulty) ?? 0) - count);
      }
      remainingTotal = Array.from(remaining.values()).reduce(
        (sum, value) => sum + value,
        0,
      );
    }

    if (!ok) continue;
    if (Array.from(remaining.values()).some((value) => value !== 0)) continue;
    return selectedGroups;
  }

  return null;
}

function countGroupDifficulties(group: QuestionGroup) {
  const counts = new Map<DifficultyLevel, number>();
  for (const question of group.questions) {
    counts.set(question.difficulty, (counts.get(question.difficulty) ?? 0) + 1);
  }
  return counts;
}

function shuffledCopy<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
