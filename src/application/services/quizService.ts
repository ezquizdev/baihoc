import {
  backfillAttemptQuestionSnapshotsForQuiz,
  backfillAttemptSnapshotsForQuiz,
} from "@/application/infra/db/attemptRepo";
import { findCustomQuizByGeneratedQuizId } from "@/application/infra/db/customQuizRepo";
import {
  listQuestionIdsByIds,
  listQuestionsByIds,
  listQuestionsForPassage,
} from "@/application/infra/db/questionRepo";
import {
  deleteQuiz,
  getQuizDetail as getQuizDetailRepo,
  getQuizQuestionCount,
  getRandomUnattemptedQuizId,
  hasInProgressAttempts,
  insertQuiz,
  isQuizUsed,
  listCatalogPage as listCatalogPageRepo,
  listQuizzesForCatalog,
  listQuizzesForStaff,
  replaceQuizQuestions,
  updateQuiz,
  updateQuizStatus,
} from "@/application/infra/db/quizRepo";
import type {
  DifficultyLabel,
  DifficultyLevel,
} from "@/application/models/enums";
import type {
  ChallengeSettings,
  QuizCatalogItem,
  QuizDetail,
  QuizListItem,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/quiz";
import { ServiceError } from "@/application/services/errors";
import { mapDifficultyLabelsToLevels } from "@/lib/difficulty";

type CreateQuizInput = {
  title: string;
  description?: string | null;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  featuredRank?: number | null;
  createdBy: string;
  challenge?: Partial<ChallengeSettings> | null;
};

type QuestionLinkInput = {
  questionId: string;
  position?: number;
  score?: number | null;
  required?: boolean;
};

export async function createQuiz(input: CreateQuizInput) {
  validateQuizInput(input);
  return insertQuiz({ ...input, challenge: input.challenge ?? undefined });
}

export async function updateQuizMeta(
  quizId: string,
  input: Partial<CreateQuizInput> & { status?: QuizStatus },
) {
  const inProgress = await hasInProgressAttempts(quizId);
  if (inProgress) {
    throw new ServiceError(
      "QUIZ_UPDATE_BLOCKED_IN_PROGRESS",
      "Quiz đang có lượt làm đang diễn ra. Không thể chỉnh sửa nội dung.",
      409,
    );
  }
  if (input.status === "published") {
    await ensureQuizHasQuestions(quizId);
  }
  validateQuizInput({ ...input, quizId } as CreateQuizInput, true);
  const updated = await updateQuiz({ quizId, ...input });
  return updated;
}

export async function setQuizQuestions(
  quizId: string,
  questions: QuestionLinkInput[],
) {
  const inProgress = await hasInProgressAttempts(quizId);
  if (inProgress) {
    throw new ServiceError(
      "QUIZ_UPDATE_BLOCKED_IN_PROGRESS",
      "Quiz đang có lượt làm đang diễn ra. Không thể chỉnh sửa nội dung.",
      409,
    );
  }
  if (!questions.length) {
    await replaceQuizQuestions(quizId, []);
    return;
  }
  const questionIds = questions.map((q) => q.questionId);
  ensureUnique(questionIds);
  const positions = questions.map((q, idx) => q.position ?? idx + 1);
  ensureSequential(positions);
  await ensureQuestionsExist(questionIds);
  const normalizedInput = questions.map((q, idx) => ({
    questionId: q.questionId,
    position: q.position ?? idx + 1,
    score: q.score ?? null,
    required: q.required ?? true,
  }));

  const passageFix = await validateAndSuggestPassageGroups(questionIds);
  if (passageFix) {
    const inputById = new Map(
      normalizedInput.map((q) => [q.questionId, q] as const),
    );
    const suggestedQuestions = passageFix.suggestedQuestionIds.map(
      (questionId, idx) => ({
        questionId,
        position: idx + 1,
        score: inputById.get(questionId)?.score ?? null,
        required: inputById.get(questionId)?.required ?? true,
      }),
    );
    throw new ServiceError(
      "QUIZ_PASSAGE_GROUP_INVALID",
      "Quiz có câu hỏi thuộc passage nhưng chưa đủ hoặc chưa được xếp liền nhau đúng thứ tự.",
      409,
      {
        passages: passageFix.passages,
        suggested: { questions: suggestedQuestions },
      },
    );
  }

  const normalized = normalizedInput;
  await replaceQuizQuestions(quizId, normalized);
}

async function validateAndSuggestPassageGroups(questionIds: string[]) {
  const questions = await listQuestionsByIds(questionIds);
  const passageIds = Array.from(
    new Set(
      questions
        .map((q) => q.passageId ?? null)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (passageIds.length === 0) return null;

  const passageQuestions = await Promise.all(
    passageIds.map(async (passageId) => {
      const items = await listQuestionsForPassage(passageId);
      return { passageId, items };
    }),
  );

  const expectedByPassageId = new Map(
    passageQuestions.map(({ passageId, items }) => [
      passageId,
      items.map((q) => q.id),
    ]),
  );

  const passageByQuestionId = new Map<string, string>();
  for (const q of questions) {
    if (!q.passageId) continue;
    passageByQuestionId.set(q.id, q.passageId);
  }

  const violations: Array<{
    passageId: string;
    expectedQuestionIds: string[];
    providedQuestionIds: string[];
    missingQuestionIds: string[];
    needsReorder: boolean;
    needsConsecutive: boolean;
  }> = [];

  for (const passageId of passageIds) {
    const expected = expectedByPassageId.get(passageId) ?? [];
    if (expected.length <= 1) continue;

    const provided = questionIds.filter(
      (id) => passageByQuestionId.get(id) === passageId,
    );
    const providedSet = new Set(provided);
    const missing = expected.filter((id) => !providedSet.has(id));

    let needsReorder = false;
    let needsConsecutive = false;
    if (missing.length > 0) {
      needsReorder = true;
      needsConsecutive = true;
    } else {
      // Full group is present: check order and consecutiveness.
      const indices = expected.map((id) => questionIds.indexOf(id));
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      needsConsecutive = max - min + 1 !== expected.length;
      needsReorder = expected.some((id, idx) => questionIds[min + idx] !== id);
    }

    if (missing.length || needsReorder || needsConsecutive) {
      violations.push({
        passageId,
        expectedQuestionIds: expected,
        providedQuestionIds: provided,
        missingQuestionIds: missing,
        needsReorder,
        needsConsecutive,
      });
    }
  }

  if (!violations.length) return null;

  const suggestedQuestionIds = normalizePassageGroups(
    questionIds,
    expectedByPassageId,
    passageByQuestionId,
  );
  return {
    passages: violations,
    suggestedQuestionIds,
  };
}

function normalizePassageGroups(
  questionIds: string[],
  expectedByPassageId: Map<string, string[]>,
  passageByQuestionId: Map<string, string>,
) {
  let next = [...questionIds];

  const groupAnchorOrder = Array.from(expectedByPassageId.keys())
    .map((passageId) => {
      const expected = expectedByPassageId.get(passageId) ?? [];
      const indices = expected
        .map((id) => next.indexOf(id))
        .filter((idx) => idx >= 0);
      const anchor = indices.length
        ? Math.min(...indices)
        : Number.POSITIVE_INFINITY;
      return { passageId, anchor };
    })
    .sort((a, b) => a.anchor - b.anchor);

  for (const { passageId } of groupAnchorOrder) {
    const expected = expectedByPassageId.get(passageId) ?? [];
    if (expected.length === 0) continue;
    const currentIndices = expected
      .map((id) => next.indexOf(id))
      .filter((idx) => idx >= 0);
    const insertAt = currentIndices.length
      ? Math.min(...currentIndices)
      : next.length;

    next = next.filter((id) => passageByQuestionId.get(id) !== passageId);
    next.splice(insertAt, 0, ...expected);
  }

  return next;
}

export async function publishQuiz(quizId: string) {
  await ensureQuizHasQuestions(quizId);
  const res = await updateQuizStatus(quizId, "published");
  if (!res) throw new Error("Quiz not found");
  return res;
}

export async function archiveQuiz(quizId: string) {
  const res = await updateQuizStatus(quizId, "archived");
  if (!res) throw new Error("Quiz not found");
  return res;
}

export async function deleteQuizWithRules(quizId: string) {
  const inProgress = await hasInProgressAttempts(quizId);
  if (inProgress) {
    throw new ServiceError(
      "QUIZ_DELETE_BLOCKED_IN_PROGRESS",
      "Không thể xóa quiz vì đang có lượt làm đang diễn ra.",
      409,
    );
  }

  const used = await isQuizUsed(quizId);
  if (used) {
    await backfillAttemptSnapshotsForQuiz(quizId);
    await backfillAttemptQuestionSnapshotsForQuiz(quizId);
  }
  await deleteQuiz(quizId);
  return { status: "deleted" as const };
}

export async function listCatalogQuizzes(params: {
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
  return listQuizzesForCatalog(params);
}

export async function listCatalogPage(
  userId: string,
  params: {
    subjectIds?: string[];
    difficulty?: DifficultyLabel[];
    search?: string;
    minQuestions?: number;
    maxQuestions?: number;
    minDurationMinutes?: number;
    maxDurationMinutes?: number;
    status?: "todo" | "done" | "challenge" | "all";
    sort?: "newest" | "oldest";
    limit?: number;
    offset?: number;
  },
): Promise<{ items: QuizCatalogItem[]; total: number }> {
  const search = params.search?.trim();
  const difficultyLevels = mapDifficultyLabelsToLevels(params.difficulty);
  return listCatalogPageRepo({
    userId,
    subjectIds: params.subjectIds,
    difficulty: difficultyLevels,
    search: search || undefined,
    minQuestions: params.minQuestions,
    maxQuestions: params.maxQuestions,
    minDurationSeconds: toSeconds(params.minDurationMinutes),
    maxDurationSeconds: toSeconds(params.maxDurationMinutes),
    status: params.status,
    sort: params.sort,
    limit: params.limit,
    offset: params.offset,
  });
}

export async function getRandomUnattemptedCatalogQuizId(
  userId: string,
  options?: { includePremium?: boolean },
) {
  return getRandomUnattemptedQuizId(userId, options);
}

export async function listStaffQuizzes(params: {
  status?: QuizStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return listQuizzesForStaff(params);
}

export async function getQuizDetailForStaff(
  quizId: string,
): Promise<QuizDetail> {
  const quiz = await getQuizDetailRepo(quizId);
  if (!quiz) throw new Error("Quiz not found");
  return quiz;
}

export async function getPublishedQuizDetail(
  quizId: string,
): Promise<QuizDetail> {
  const quiz = await getQuizDetailRepo(quizId);
  if (!quiz || quiz.status !== "published") {
    throw new Error("Quiz not found");
  }
  const custom = await findCustomQuizByGeneratedQuizId(quizId);
  if (custom) {
    throw new Error("Quiz not found");
  }
  return quiz;
}

function validateQuizInput(input: CreateQuizInput, partial = false) {
  if (!partial && !input.title?.trim()) {
    throw new Error("Quiz title is required");
  }
  if (input.difficulty !== undefined) {
    if (
      !Number.isInteger(input.difficulty) ||
      input.difficulty < 1 ||
      input.difficulty > 5
    ) {
      throw new Error("Difficulty must be an integer from 1 to 5");
    }
  }
  if (input.isChallenge) {
    if (!input.challenge) {
      throw new Error("Challenge settings are required for challenge quizzes");
    }
    const { startAt, endAt } = input.challenge;
    if (!startAt || !endAt) {
      throw new Error("Challenge requires start and end");
    }
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new Error("Thời gian challenge không hợp lệ.");
    }
    if (startMs >= endMs) {
      throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
    }
  }
}

function ensureSequential(positions: number[]) {
  const sorted = [...positions].sort((a, b) => a - b);
  sorted.forEach((pos, idx) => {
    if (pos !== idx + 1) {
      throw new Error("Positions must be a 1-based, gapless sequence");
    }
  });
}

function ensureUnique(ids: string[]) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("Duplicate question IDs are not allowed");
  }
}

async function ensureQuestionsExist(questionIds: string[]) {
  const found = new Set(await listQuestionIdsByIds(questionIds));
  const missing = questionIds.filter((id) => !found.has(id));
  if (missing.length) {
    throw new Error(`Questions not found: ${missing.join(", ")}`);
  }
}

async function ensureQuizHasQuestions(quizId: string) {
  const questionCount = await getQuizQuestionCount(quizId);
  if (questionCount === null) {
    throw new Error("Quiz not found");
  }
  if (questionCount < 1) {
    throw new ServiceError(
      "QUIZ_PUBLISH_EMPTY",
      "Quiz chưa có câu hỏi. Vui lòng thêm ít nhất 1 câu hỏi trước khi xuất bản.",
      409,
    );
  }
}

function toSeconds(minutes?: number) {
  if (minutes === undefined) return undefined;
  if (!Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes * 60));
}
