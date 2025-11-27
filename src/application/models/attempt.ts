import type { QuestionType } from "@/application/models/enums";

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
