import type { DifficultyLevel } from "@/application/models/enums";
import type {
  QuestionDetail,
  QuestionStatus,
  QuestionType,
} from "@/application/models/question";
import type {
  QuestionSortBy,
  QuestionSortDir,
} from "@/application/models/questionList";
import {
  archiveQuestion,
  createQuestion,
  deleteQuestionWithRules,
  getQuestionDetail,
  listQuestions,
  updateQuestion,
} from "@/application/services/questionService";

export async function controllerCreateQuestion(input: {
  subjectId: string;
  defaultDifficulty: DifficultyLevel;
  type: QuestionType;
  stem: string;
  explanation?: string | null;
  tags?: string[];
  topicIds?: string[];
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
  passage?: { content: string } | null;
  passageId?: string | null;
  passagePosition?: number;
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
    defaultDifficulty?: DifficultyLevel;
    type?: QuestionType;
    stem?: string;
    explanation?: string | null;
    tags?: string[];
    topicIds?: string[];
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
    passage?: { content: string } | null;
    passageId?: string | null;
    passagePosition?: number;
  },
) {
  return updateQuestion(questionId, {
    ...input,
    options:
      input.options === null
        ? null
        : input.options?.map((o) => ({
            label: o.label ?? null,
            text: o.text,
            isCorrect: o.isCorrect,
            position: o.position,
          })),
    shortAnswers:
      input.shortAnswers === null
        ? null
        : input.shortAnswers?.map((a) => ({
            acceptableAnswer: a.acceptableAnswer,
            caseSensitive: a.caseSensitive ?? false,
          })),
  });
}

export async function controllerListQuestions(params: {
  subjectIds?: string[];
  difficultyLevels?: DifficultyLevel[];
  types?: QuestionType[];
  statuses?: QuestionStatus[];
  hasPassage?: boolean;
  search?: string;
  sortBy?: QuestionSortBy;
  sortDir?: QuestionSortDir;
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
