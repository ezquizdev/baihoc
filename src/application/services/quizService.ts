import { query } from "@/application/infra/db/pool";
import {
  deleteQuiz,
  getQuizDetail as getQuizDetailRepo,
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
  const positions = questions.map((q, idx) => q.position ?? idx + 1);
  ensureSequential(positions);
  await ensureQuestionsExist(questions.map((q) => q.questionId));
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
  const used = await isQuizUsed(quizId);
  if (used) {
    throw new ServiceError(
      "QUIZ_HAS_ATTEMPTS",
      "Quiz has attempts; please archive instead of deleting",
      409,
    );
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
    status?: "todo" | "done" | "all";
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
    if (new Date(startAt) >= new Date(endAt)) {
      throw new Error("Challenge end time must be after start time");
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

async function ensureQuestionsExist(questionIds: string[]) {
  const res = await query<{ id: string }>(
    `SELECT id FROM questions WHERE id = ANY($1::uuid[])`,
    [questionIds],
  );
  const found = new Set(res.rows.map((r) => r.id));
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
