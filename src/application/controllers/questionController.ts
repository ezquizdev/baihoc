import type {
  QuestionDetail,
  QuestionStatus,
  QuestionType,
} from "@/application/models/question";
import {
  archiveQuestion,
  createQuestion,
  getQuestionDetail,
  listQuestions,
  updateQuestion,
} from "@/application/services/questionService";

export async function controllerCreateQuestion(input: {
  subjectId: string;
  defaultDifficulty: "easy" | "medium" | "hard" | "mixed";
  type: QuestionType;
  stem: string;
  explanation?: string | null;
  tags?: string[];
  defaultScore?: number;
  createdBy: string;
  options?: {
    label?: string | null;
    text: string;
    isCorrect: boolean;
    position: number;
  }[];
  shortAnswers?: {
    acceptableAnswer: string;
    caseSensitive?: boolean;
  }[];
  passage?: { content: string; mediaUrls?: string[] } | null;
}): Promise<QuestionDetail> {
  return createQuestion({
    ...input,
    options: input.options?.map((o) => ({
      label: o.label ?? null,
      text: o.text,
      isCorrect: o.isCorrect,
      position: o.position,
    })),
    shortAnswers: input.shortAnswers?.map((a) => ({
      acceptableAnswer: a.acceptableAnswer,
      caseSensitive: a.caseSensitive ?? false,
    })),
  });
}

export async function controllerUpdateQuestion(
  questionId: string,
  input: {
    subjectId?: string;
    defaultDifficulty?: "easy" | "medium" | "hard" | "mixed";
    type?: QuestionType;
    stem?: string;
    explanation?: string | null;
    tags?: string[];
    defaultScore?: number;
    status?: QuestionStatus;
    options?:
      | {
          label?: string | null;
          text: string;
          isCorrect: boolean;
          position: number;
        }[]
      | null;
    shortAnswers?:
      | {
          acceptableAnswer: string;
          caseSensitive?: boolean;
        }[]
      | null;
    passage?: { content: string; mediaUrls?: string[] } | null;
  },
) {
  return updateQuestion(questionId, {
    ...input,
    options: input.options?.map((o) => ({
      label: o.label ?? null,
      text: o.text,
      isCorrect: o.isCorrect,
      position: o.position,
    })),
    shortAnswers: input.shortAnswers?.map((a) => ({
      acceptableAnswer: a.acceptableAnswer,
      caseSensitive: a.caseSensitive ?? false,
    })),
  });
}

export async function controllerListQuestions(params: {
  subjectId?: string;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  status?: QuestionStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return listQuestions(params);
}

export async function controllerGetQuestionDetail(questionId: string) {
  return getQuestionDetail(questionId);
}

export async function controllerArchiveQuestion(questionId: string) {
  await archiveQuestion(questionId);
}

export async function controllerDeleteQuestion(questionId: string) {
  return deleteQuestionWithRules(questionId);
}
