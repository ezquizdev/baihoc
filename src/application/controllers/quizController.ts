import type {
  DifficultyLabel,
  DifficultyLevel,
} from "@/application/models/enums";
import type {
  QuizCatalogItem,
  QuizDetail,
  QuizListItem,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/quiz";
import {
  archiveQuiz,
  createQuiz,
  deleteQuizWithRules,
  getPublishedQuizDetail,
  getQuizDetailForStaff,
  getRandomUnattemptedCatalogQuizId,
  listCatalogPage,
  listCatalogQuizzes,
  listStaffQuizzes,
  publishQuiz,
  setQuizQuestions,
  updateQuizMeta,
} from "@/application/services/quizService";

export async function controllerCreateQuiz(input: {
  title: string;
  description?: string | null;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  featuredRank?: number | null;
  createdBy: string;
  challenge?: {
    startAt: string;
    endAt: string;
  };
}) {
  return createQuiz(input);
}

export async function controllerUpdateQuiz(
  quizId: string,
  input: {
    title?: string;
    description?: string | null;
    difficulty?: DifficultyLevel;
    visibility?: QuizVisibility;
    isChallenge?: boolean;
    estimatedTimeSeconds?: number | null;
    featuredRank?: number | null;
    status?: QuizStatus;
    challenge?: {
      startAt: string;
      endAt: string;
    } | null;
  },
) {
  return updateQuizMeta(quizId, input);
}

export async function controllerSetQuizQuestions(
  quizId: string,
  items: Array<{
    questionId: string;
    position?: number;
    score?: number | null;
    required?: boolean;
  }>,
) {
  await setQuizQuestions(quizId, items);
}

export async function controllerPublishQuiz(quizId: string) {
  return publishQuiz(quizId);
}

export async function controllerArchiveQuiz(quizId: string) {
  return archiveQuiz(quizId);
}

export async function controllerDeleteQuiz(quizId: string) {
  return deleteQuizWithRules(quizId);
}

export async function controllerListCatalog(
  params: {
    subjectId?: string;
    topicIds?: string[];
    difficulty?: DifficultyLevel;
    visibility?: QuizVisibility;
    search?: string;
    limit?: number;
    offset?: number;
    minQuestions?: number;
    maxQuestions?: number;
  } = {},
): Promise<QuizListItem[]> {
  return listCatalogQuizzes(params);
}

export async function controllerListCatalogPage(
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
  } = {},
): Promise<{ items: QuizCatalogItem[]; total: number }> {
  return listCatalogPage(userId, params);
}

export async function controllerGetRandomUnattemptedCatalogQuizId(
  userId: string,
) {
  return getRandomUnattemptedCatalogQuizId(userId);
}

export async function controllerListStaffQuizzes(
  params: {
    status?: QuizStatus;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<QuizListItem[]> {
  return listStaffQuizzes(params);
}

export async function controllerGetStaffQuizDetail(
  quizId: string,
): Promise<QuizDetail> {
  return getQuizDetailForStaff(quizId);
}

export async function controllerGetPublishedQuiz(quizId: string) {
  return getPublishedQuizDetail(quizId);
}
