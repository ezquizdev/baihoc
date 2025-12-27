import type { DifficultyLevel, QuestionType } from "@/application/models/enums";

export const AttemptStatusValues = [
  "in_progress",
  "submitted",
  "auto_submitted",
  "abandoned",
] as const;
export type AttemptStatus = (typeof AttemptStatusValues)[number];

export type Attempt = {
  id: string;
  quizId: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  timeLimitSeconds: number | null;
  remainingSeconds: number | null;
  scoreRaw: number;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
};

export type AttemptAnswer = {
  questionId: string;
  selectedOptionIds: string[] | null;
  textAnswer: string | null;
  answeredAt?: string | null;
  isCorrect?: boolean;
  awardedScore?: number;
};

export type AttemptQuestionOption = {
  id: string;
  label: string | null;
  text: string;
  position: number;
};

export type AttemptPassage = {
  id: string;
  content: string;
  mediaUrls: string[];
  position: number;
};

export type AttemptQuestion = {
  id: string;
  stem: string;
  type: QuestionType;
  position: number;
  score: number | null;
  defaultScore: number;
  passage: AttemptPassage | null;
  options: AttemptQuestionOption[];
};

export type AttemptStateResponse = {
  attempt: Attempt;
  ownerId: string;
  quizId: string;
  quizTitle: string | null;
  questions: AttemptQuestion[];
  answers: AttemptAnswer[];
};

export type AttemptReviewQuestion = {
  id: string;
  position: number;
  type: QuestionType;
  exists: boolean;
  stem: string | null;
  passage: AttemptPassage | null;
  options: AttemptQuestionOption[];
};

export type AttemptReviewStateResponse = {
  reviewMode: "snapshot" | "legacy";
  attempt: Attempt;
  ownerId: string;
  quizId: string;
  quizTitle: string | null;
  quizExists: boolean;
  judgementVersion: number;
  judgedAt: string | null;
  quizContentHashSnapshot: string | null;
  quizContentHashCurrent: string | null;
  quizContentChanged: boolean;
  subjectScores: AttemptSubjectScore[];
  subjectScoresEstimated: boolean;
  questions: AttemptReviewQuestion[];
  answers: AttemptAnswer[];
};

export const AttemptHistoryKindValues = [
  "all",
  "practice",
  "challenge",
  "custom",
] as const;
export type AttemptHistoryKind = (typeof AttemptHistoryKindValues)[number];

export type AttemptSubjectScore = {
  subjectId: string;
  name: string;
  slug: string;
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
};

export type AttemptHistoryItem = {
  attemptId: string;
  quizId: string;
  quizExists: boolean;
  quizTitle: string | null;
  quizDifficulty: DifficultyLevel;
  quizEstimatedTimeSeconds: number | null;
  isChallenge: boolean;
  subjectScoresEstimated: boolean;
  subjectScores: AttemptSubjectScore[];
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  customQuiz?: {
    id: string;
    config: unknown;
  };
};
