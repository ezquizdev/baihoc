import type { AttemptStatus } from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/question";

export type StudentDashboardHighlightChallengeCardDto =
  | { status: "none" }
  | {
      status: "active";
      quizId: string;
      quizTitle: string | null;
      startAt: string;
      endAt: string;
      question: {
        id: string;
        stem: string;
        type: Extract<QuestionType, "mcq_single" | "mcq_multi">;
        explanation: string | null;
      };
      options: Array<{ id: string; text: string; position: number }>;
      submission: null | {
        selectedOptionIds: string[];
        isCorrect: boolean;
        createdAt: string;
      };
      correctOptionIds?: string[];
      attempt: { id: string; status: AttemptStatus } | null;
      actionLabel: string;
      actionHref: string;
    };

export type HighlightChallengeSubmitResultDto = {
  quizId: string;
  questionId: string;
  questionType: Extract<QuestionType, "mcq_single" | "mcq_multi">;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
  explanation: string | null;
  actionLabel: string;
  actionHref: string;
};
