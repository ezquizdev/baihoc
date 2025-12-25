import type {
  DifficultyLevel,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/enums";

export type { QuizStatus, QuizVisibility } from "@/application/models/enums";

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  status: QuizStatus;
  isChallenge: boolean;
  estimatedTimeSeconds: number | null;
  featuredRank: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  questionCount?: number;
};

export type ChallengeSettings = {
  quizId: string;
  startAt: string;
  endAt: string;
  timeLimitSeconds: number;
};

export type QuizQuestionLink = {
  quizId: string;
  questionId: string;
  position: number;
  score: number | null;
  required: boolean;
};

export type QuizDetail = Quiz & {
  topicIds: string[];
  subjectIds: string[];
  questions: QuizQuestionSummary[];
  challenge?: ChallengeSettings | null;
};

export type QuizQuestionSummary = {
  id: string;
  stem: string;
  type: string;
  defaultScore: number;
  position: number;
  score: number | null;
  required: boolean;
};

export type QuizListItem = Quiz & {
  topicIds: string[];
  subjectIds: string[];
};

export type QuizCatalogItem = Quiz & {
  subjectName: string;
  subjectSlug: string;
  attemptCount: number;
  topicIds?: string[];
  subjectBreakdown?: QuizSubjectBreakdown[];
};

export type QuizSubjectBreakdown = {
  subjectId: string;
  name: string;
  slug: string;
  questionCount: number;
};
