import {
  archiveQuestion as archiveQuestionRepo,
  deleteQuestion,
  getQuestionDetail as getQuestionDetailRepo,
  insertQuestion,
  isQuestionUsed,
  listQuestions as listQuestionsRepo,
  updateQuestion as updateQuestionRepo,
} from "@/application/infra/db/questionRepo";
import type {
  QuestionOption,
  QuestionStatus,
  QuestionType,
  ShortAnswerKey,
} from "@/application/models/question";

type CreateQuestionInput = {
  subjectId: string;
  defaultDifficulty: "easy" | "medium" | "hard" | "mixed";
  type: QuestionType;
  stem: string;
  explanation?: string | null;
  tags?: string[];
  defaultScore?: number;
  createdBy: string;
  options?: Array<Omit<QuestionOption, "id" | "questionId">>;
  shortAnswers?: Array<Omit<ShortAnswerKey, "id" | "questionId">>;
  passage?: { content: string; mediaUrls?: string[] } | null;
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
    defaultScore: input.defaultScore ?? 1,
    createdBy: input.createdBy,
    options: input.options,
    shortAnswers: input.shortAnswers,
    passage: input.passage ?? undefined,
  });
}

export async function updateQuestion(
  questionId: string,
  input: Partial<CreateQuestionInput> & { status?: QuestionStatus },
) {
  validateQuestionPayload(
    { ...input, questionId } as CreateQuestionInput,
    true,
  );
  const res = await updateQuestionRepo({
    questionId,
    subjectId: input.subjectId,
    defaultDifficulty: input.defaultDifficulty,
    type: input.type,
    stem: input.stem,
    explanation: input.explanation,
    tags: input.tags,
    defaultScore: input.defaultScore,
    status: input.status,
    options: input.options,
    shortAnswers: input.shortAnswers,
    passage: input.passage ?? undefined,
  });
  if (!res) {
    throw new Error("Question not found");
  }
  return res;
}

export async function listQuestions(params: {
  subjectId?: string;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
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
    return { status: "archived" as const };
  }
  await deleteQuestion(questionId);
  return { status: "deleted" as const };
}

function validateQuestionPayload(input: CreateQuestionInput, partial = false) {
  if (!partial && !input.stem?.trim()) {
    throw new Error("Question stem is required");
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

  if (input.type === "passage") {
    if (input.passage === undefined && !partial) {
      throw new Error("Passage content is required");
    }
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
