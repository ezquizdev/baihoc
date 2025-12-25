import {
  archiveQuestion as archiveQuestionRepo,
  deleteQuestion,
  getQuestionDetail as getQuestionDetailRepo,
  insertQuestion,
  isQuestionUsed,
  listQuestions as listQuestionsRepo,
  updateQuestion as updateQuestionRepo,
} from "@/application/infra/db/questionRepo";
import type { DifficultyLevel } from "@/application/models/enums";
import type {
  QuestionOption,
  QuestionStatus,
  QuestionType,
  ShortAnswerKey,
} from "@/application/models/question";

type CreateQuestionInput = {
  subjectId: string;
  defaultDifficulty: DifficultyLevel;
  type: QuestionType;
  stem: string;
  explanation?: string | null;
  tags?: string[];
  topicIds?: string[];
  defaultScore?: number;
  createdBy: string;
  options?: Array<Omit<QuestionOption, "id" | "questionId">>;
  shortAnswers?: Array<Omit<ShortAnswerKey, "id" | "questionId">>;
  passage?: { content: string; mediaUrls?: string[] } | null;
  passageId?: string | null;
  passagePosition?: number;
};

type UpdateQuestionInput = Partial<
  Omit<CreateQuestionInput, "options" | "shortAnswers">
> & {
  status?: QuestionStatus;
  options?: Array<Omit<QuestionOption, "id" | "questionId">> | null;
  shortAnswers?: Array<Omit<ShortAnswerKey, "id" | "questionId">> | null;
};

export async function createQuestion(input: CreateQuestionInput) {
  validateQuestionPayload(input);
  return insertQuestion({
    subjectId: input.subjectId,
    defaultDifficulty: input.defaultDifficulty,
    type: input.type,
    stem: input.stem.trim(),
    explanation: input.explanation ?? null,
    tags: input.tags ?? [],
    topicIds: input.topicIds ?? [],
    defaultScore: input.defaultScore ?? 1,
    createdBy: input.createdBy,
    options: input.options,
    shortAnswers: input.shortAnswers,
    passage: input.passage ?? undefined,
    passageId: input.passageId ?? undefined,
    passagePosition: input.passagePosition,
  });
}

export async function updateQuestion(
  questionId: string,
  input: UpdateQuestionInput,
) {
  const needsStructuralValidation =
    input.type !== undefined ||
    input.options !== undefined ||
    input.shortAnswers !== undefined;

  if (needsStructuralValidation) {
    const existing = await getQuestionDetailRepo(questionId);
    if (!existing) {
      throw new Error("Question not found");
    }
    const effectiveType = input.type ?? existing.question.type;

    const optionsProvided = input.options !== undefined;
    const shortAnswersProvided = input.shortAnswers !== undefined;

    const isMcq =
      effectiveType === "mcq_single" || effectiveType === "mcq_multi";

    if (effectiveType === "short_answer") {
      if (optionsProvided && input.options !== null) {
        throw new Error("Options can only be set for MCQ questions");
      }
      if (shortAnswersProvided && input.shortAnswers === null) {
        throw new Error("Short-answer keys are required");
      }
    } else if (isMcq) {
      if (optionsProvided && input.options === null) {
        throw new Error("Options are required for MCQ");
      }
      if (shortAnswersProvided && input.shortAnswers !== null) {
        throw new Error(
          "Short-answer keys can only be set for short-answer questions",
        );
      }
    }

    const resolvedOptions = isMcq
      ? (input.options ??
        existing.options.map((option) => ({
          label: option.label,
          text: option.text,
          isCorrect: option.isCorrect,
          position: option.position,
        })))
      : undefined;

    const resolvedShortAnswers =
      effectiveType === "short_answer"
        ? (input.shortAnswers ??
          existing.shortAnswerKeys.map((key) => ({
            acceptableAnswer: key.acceptableAnswer,
            caseSensitive: key.caseSensitive,
          })))
        : undefined;

    validateQuestionPayload({
      subjectId: input.subjectId ?? existing.question.subjectId,
      defaultDifficulty:
        input.defaultDifficulty ?? existing.question.defaultDifficulty,
      type: effectiveType,
      stem: input.stem ?? existing.question.stem,
      explanation: input.explanation ?? existing.question.explanation,
      tags: input.tags ?? existing.question.tags,
      topicIds: input.topicIds ?? existing.question.topicIds,
      defaultScore: input.defaultScore ?? existing.question.defaultScore,
      createdBy: existing.question.createdBy,
      options: resolvedOptions,
      shortAnswers: resolvedShortAnswers,
      passage: input.passage ?? undefined,
      passageId: input.passageId ?? undefined,
      passagePosition:
        input.passagePosition ?? existing.question.passagePosition ?? undefined,
    });
  } else {
    validateQuestionPayload(
      { ...input, questionId } as CreateQuestionInput,
      true,
    );
  }

  const res = await updateQuestionRepo({
    questionId,
    subjectId: input.subjectId,
    defaultDifficulty: input.defaultDifficulty,
    type: input.type,
    stem: input.stem,
    explanation: input.explanation,
    tags: input.tags,
    topicIds: input.topicIds,
    defaultScore: input.defaultScore,
    status: input.status,
    options: input.options,
    shortAnswers: input.shortAnswers,
    passage: input.passage ?? undefined,
    passageId: input.passageId ?? undefined,
    passagePosition: input.passagePosition,
  });
  if (!res) {
    throw new Error("Question not found");
  }
  return res;
}

export async function listQuestions(params: {
  subjectId?: string;
  difficulty?: DifficultyLevel;
  status?: QuestionStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return listQuestionsRepo(params);
}

export async function getQuestionDetail(questionId: string) {
  const res = await getQuestionDetailRepo(questionId);
  if (!res) throw new Error("Question not found");
  return res;
}

export async function archiveQuestion(questionId: string) {
  await archiveQuestionRepo(questionId);
}

export async function deleteQuestionWithRules(questionId: string) {
  const used = await isQuestionUsed(questionId);
  if (used) {
    await archiveQuestionRepo(questionId);
    return { status: "archived" as const, code: "QUESTION_IN_USE" as const };
  }
  await deleteQuestion(questionId);
  return { status: "deleted" as const };
}

function validateQuestionPayload(input: CreateQuestionInput, partial = false) {
  if (!partial && !input.stem?.trim()) {
    throw new Error("Question stem is required");
  }
  if (input.defaultDifficulty !== undefined) {
    if (
      !Number.isInteger(input.defaultDifficulty) ||
      input.defaultDifficulty < 1 ||
      input.defaultDifficulty > 5
    ) {
      throw new Error("Difficulty must be an integer from 1 to 5");
    }
  }
  if (input.type === "mcq_single" || input.type === "mcq_multi") {
    if (input.options === undefined) {
      if (!partial) throw new Error("Options are required for MCQ");
    } else {
      if (input.options.length < 2) {
        throw new Error("MCQ must have at least two options");
      }
      const correctCount = input.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new Error("At least one correct option is required");
      }
      if (input.type === "mcq_single" && correctCount !== 1) {
        throw new Error(
          "Single-choice MCQ must have exactly one correct option",
        );
      }
      validatePositions(input.options.map((o) => o.position));
    }
  }

  if (input.type === "short_answer") {
    if (input.shortAnswers === undefined) {
      if (!partial) throw new Error("Short-answer keys are required");
    } else if (!input.shortAnswers.length) {
      throw new Error("Provide at least one acceptable answer");
    }
  }
  if (input.passagePosition !== undefined && input.passagePosition <= 0) {
    throw new Error("Passage position must be positive");
  }
}

function validatePositions(positions: number[]) {
  const dedup = new Set(positions);
  if (dedup.size !== positions.length) {
    throw new Error("Option positions must be unique");
  }
  const sorted = [...positions].sort((a, b) => a - b);
  sorted.forEach((pos, idx) => {
    if (pos <= 0) throw new Error("Positions must be positive");
    if (idx > 0 && pos === sorted[idx - 1]) {
      throw new Error("Option positions cannot repeat");
    }
  });
}
