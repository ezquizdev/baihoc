export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";
export type QuizVisibility = "free" | "premium";
export type QuizStatus = "draft" | "published" | "archived";

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  difficulty: DifficultyLevel;
  visibility: QuizVisibility;
  status: QuizStatus;
  isChallenge: boolean;
  estimatedTimeSeconds: number | null;
  thumbnailUrl: string | null;
  featuredRank: number | null;
  ratingCount: number;
  ratingAvg: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ChallengeSettings = {
  quizId: string;
  startAt: string;
  endAt: string;
  timeLimitSeconds: number;
  rules: unknown;
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
};
