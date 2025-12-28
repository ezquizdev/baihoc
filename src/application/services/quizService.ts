import {
  backfillAttemptQuestionSnapshotsForQuiz,
  backfillAttemptSnapshotsForQuiz,
} from "@/application/infra/db/attemptRepo";
import { findCustomQuizByGeneratedQuizId } from "@/application/infra/db/customQuizRepo";
import { listQuestionIdsByIds } from "@/application/infra/db/questionRepo";
import {
  deleteQuiz,
  getQuizDetail as getQuizDetailRepo,
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
  validateQuizInput({ ...input, quizId } as CreateQuizInput, true);
  const updated = await updateQuiz({ quizId, ...input });
  return updated;
}

export async function setQuizQuestions(
  quizId: string,
  questions: QuestionLinkInput[],
) {
  if (!questions.length) {
    await replaceQuizQuestions(quizId, []);
    return;
  }
  const questionIds = questions.map((q) => q.questionId);
  ensureUnique(questionIds);
  const positions = questions.map((q, idx) => q.position ?? idx + 1);
  ensureSequential(positions);
  await ensureQuestionsExist(questionIds);
  const normalized = questions.map((q, idx) => ({
    questionId: q.questionId,
    position: q.position ?? idx + 1,
    score: q.score ?? null,
    required: q.required ?? true,
  }));
  await replaceQuizQuestions(quizId, normalized);
}

export async function publishQuiz(quizId: string) {
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
    const { startAt, endAt, timeLimitSeconds } = input.challenge;
    if (!startAt || !endAt || !timeLimitSeconds) {
      throw new Error("Challenge requires start, end, and time limit");
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

function toSeconds(minutes?: number) {
  if (minutes === undefined) return undefined;
  if (!Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes * 60));
}
