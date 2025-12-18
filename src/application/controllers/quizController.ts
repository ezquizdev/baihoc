import type {
  DifficultyLevel,
  QuizDetail,
  QuizListItem,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/quiz";
import {
  archiveQuiz,
  createQuiz,
  getPublishedQuizDetail,
  getQuizDetailForStaff,
  listCatalogQuizzes,
  listStaffQuizzes,
  publishQuiz,
  setQuizQuestions,
  updateQuizMeta,
} from "@/application/services/quizService";

export async function controllerCreateQuiz(input: {
  title: string;
  description?: string | null;
  subjectId: string;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  isChallenge?: boolean;
  estimatedTimeSeconds?: number | null;
  thumbnailUrl?: string | null;
  featuredRank?: number | null;
  createdBy: string;
  topicIds?: string[];
  challenge?: {
    startAt: string;
    endAt: string;
    timeLimitSeconds: number;
    rules?: unknown;
  };
}) {
  return createQuiz(input);
}

export async function controllerUpdateQuiz(
  quizId: string,
  input: {
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
    challenge?: {
      startAt: string;
      endAt: string;
      timeLimitSeconds: number;
      rules?: unknown;
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

export async function controllerListCatalog(
  params: {
    subjectId?: string;
    topicIds?: string[];
    difficulty?: DifficultyLevel;
    visibility?: QuizVisibility;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<QuizListItem[]> {
  return listCatalogQuizzes(params);
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
