import {
  type AttemptAnswerInput,
  createAttempt,
  findChallengeAttempt,
  findInProgressAttempt,
  type GradedAnswerInput,
  getAttemptById,
  getAttemptState as getAttemptStateRepo,
  getQuizAttemptMeta,
  listAttemptAnswers,
  listQuizGradingData,
  listQuizQuestionMeta,
  type QuizQuestionGrading,
  saveAttemptAnswers,
  submitAttempt as submitAttemptRepo,
} from "@/application/infra/db/attemptRepo";
import type {
  Attempt,
  AttemptAnswer,
  AttemptStateResponse,
} from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/enums";
import { ServiceError } from "@/application/services/errors";

type StartAttemptResult = {
  attemptId: string;
  resumed: boolean;
};

type AutosaveInput = {
  answers: Array<{
    questionId: string;
    selectedOptionIds?: string[] | null;
    textAnswer?: string | null;
  }>;
  remainingSeconds?: number | null;
};

export async function startOrResumeAttempt(
  userId: string,
  quizId: string,
): Promise<StartAttemptResult> {
  const quizMeta = await getQuizAttemptMeta(quizId);
  if (!quizMeta) {
    throw new ServiceError("QUIZ_NOT_FOUND", "Quiz not found", 404);
  }
  if (quizMeta.totalQuestions <= 0) {
    throw new ServiceError("QUIZ_NO_QUESTIONS", "Quiz has no questions", 400);
  }

  if (quizMeta.isChallenge) {
    const existing = await findChallengeAttempt(userId, quizId);
    if (existing) {
      if (existing.status === "in_progress") {
        return { attemptId: existing.id, resumed: true };
      }
      throw new ServiceError(
        "CHALLENGE_ALREADY_ATTEMPTED",
        "Challenge already attempted",
        409,
      );
    }
  } else {
    const existing = await findInProgressAttempt(userId, quizId);
    if (existing) {
      return { attemptId: existing.id, resumed: true };
    }
  }

  const timeLimitSeconds = quizMeta.isChallenge
    ? quizMeta.challengeTimeLimitSeconds
    : quizMeta.estimatedTimeSeconds;
  if (quizMeta.isChallenge && timeLimitSeconds === null) {
    throw new ServiceError(
      "CHALLENGE_TIME_LIMIT_MISSING",
      "Challenge time limit missing",
      400,
    );
  }

  const created = await createAttempt({
    userId,
    quizId,
    challengeId: quizMeta.isChallenge ? quizId : null,
    timeLimitSeconds: timeLimitSeconds ?? null,
    remainingSeconds: timeLimitSeconds ?? null,
    totalQuestions: quizMeta.totalQuestions,
  });

  return { attemptId: created.id, resumed: false };
}

export async function getAttemptState(
  userId: string,
  attemptId: string,
): Promise<AttemptStateResponse> {
  const state = await getAttemptStateRepo(attemptId);
  if (!state) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (state.ownerId !== userId) {
    throw new ServiceError("ATTEMPT_FORBIDDEN", "Forbidden", 403);
  }
  return applyRemainingClamp(state.attempt, state);
}

export async function autosaveAttempt(
  userId: string,
  attemptId: string,
  input: AutosaveInput,
): Promise<{ attempt: Attempt }> {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (attempt.user_id !== userId) {
    throw new ServiceError("ATTEMPT_FORBIDDEN", "Forbidden", 403);
  }
  if (attempt.status !== "in_progress") {
    throw new ServiceError(
      "ATTEMPT_ALREADY_SUBMITTED",
      "Attempt already submitted",
      409,
    );
  }

  const questionMeta = await listQuizQuestionMeta(attempt.quiz_id);
  const questionTypeMap = new Map(
    questionMeta.map((item) => [item.questionId, item.type]),
  );
  const normalized = normalizeAutosaveAnswers(input.answers, questionTypeMap);
  const remainingSeconds = resolveRemainingSeconds({
    attempt,
    clientRemaining: input.remainingSeconds,
    rejectExpired: true,
  });

  const savedAttempt = await saveAttemptAnswers({
    attemptId,
    answers: normalized,
    remainingSeconds,
  });
  if (!savedAttempt) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (savedAttempt.status !== "in_progress") {
    throw new ServiceError(
      "ATTEMPT_ALREADY_SUBMITTED",
      "Attempt already submitted",
      409,
    );
  }

  return {
    attempt: {
      ...mapAttemptRow(savedAttempt),
    },
  };
}

export async function submitAttempt(
  userId: string,
  attemptId: string,
  input: AutosaveInput,
): Promise<{ attempt: Attempt }> {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (attempt.user_id !== userId) {
    throw new ServiceError("ATTEMPT_FORBIDDEN", "Forbidden", 403);
  }
  if (attempt.status !== "in_progress") {
    throw new ServiceError(
      "ATTEMPT_ALREADY_SUBMITTED",
      "Attempt already submitted",
      409,
    );
  }

  const remainingSeconds = resolveRemainingSeconds({
    attempt,
    clientRemaining: input.remainingSeconds,
    rejectExpired: false,
  });
  const isExpired =
    attempt.time_limit_seconds !== null &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;
  const isWithinSubmitGrace =
    attempt.time_limit_seconds !== null &&
    isWithinGraceWindow(attempt.started_at, attempt.time_limit_seconds, 5);

  const gradingData = await listQuizGradingData(attempt.quiz_id);
  if (!gradingData.length) {
    throw new ServiceError("QUIZ_NO_QUESTIONS", "Quiz has no questions", 400);
  }
  const gradingMap = new Map(gradingData.map((q) => [q.questionId, q]));

  const existingAnswers = await listAttemptAnswers(attemptId);
  const normalized =
    isExpired && !isWithinSubmitGrace
      ? []
      : normalizeSubmitAnswers(input.answers, gradingMap);
  const merged = mergeAnswers(existingAnswers, normalized);

  const { gradedAnswers, correctCount, scoreRaw, scorePercent } = gradeAnswers(
    gradingData,
    merged,
  );

  const xpEarned = Math.round(scorePercent);

  const result = await submitAttemptRepo({
    attemptId,
    gradedAnswers,
    scoreRaw,
    scorePercent,
    correctCount,
    remainingSeconds,
    xpEvent: {
      userId,
      source: attempt.challenge_id ? "challenge" : "attempt",
      amount: xpEarned,
      metadata: { quizId: attempt.quiz_id },
    },
  });

  if (result.status === "not_found") {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (result.status === "already_submitted") {
    throw new ServiceError(
      "ATTEMPT_ALREADY_SUBMITTED",
      "Attempt already submitted",
      409,
    );
  }

  return { attempt: result.attempt };
}

function applyRemainingClamp(
  attempt: Attempt,
  state: AttemptStateResponse,
): AttemptStateResponse {
  if (attempt.status !== "in_progress" || attempt.timeLimitSeconds === null) {
    return state;
  }
  const serverRemaining = computeServerRemaining(
    attempt.startedAt,
    attempt.timeLimitSeconds,
  );
  const stored = attempt.remainingSeconds ?? serverRemaining;
  const clamped = Math.min(stored, serverRemaining);
  return {
    ...state,
    attempt: {
      ...attempt,
      remainingSeconds: clamped,
    },
  };
}

function resolveRemainingSeconds(params: {
  attempt: AttemptTimingRow;
  clientRemaining?: number | null;
  rejectExpired: boolean;
}): number | null {
  if (params.attempt.time_limit_seconds === null) return null;
  const serverRemaining = computeServerRemaining(
    params.attempt.started_at,
    params.attempt.time_limit_seconds,
  );
  if (serverRemaining <= 0 && params.rejectExpired) {
    throw new ServiceError("ATTEMPT_EXPIRED", "Attempt time has expired", 409);
  }
  const stored = params.attempt.remaining_seconds ?? serverRemaining;
  const client = params.clientRemaining ?? stored;
  return Math.min(serverRemaining, stored, client);
}

function computeServerRemaining(
  startedAt: string,
  timeLimitSeconds: number,
): number {
  const started = new Date(startedAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - started) / 1000);
  return Math.max(0, timeLimitSeconds - elapsedSeconds);
}

function isWithinGraceWindow(
  startedAt: string,
  timeLimitSeconds: number,
  graceSeconds: number,
): boolean {
  const started = new Date(startedAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - started) / 1000);
  const unclampedRemaining = timeLimitSeconds - elapsedSeconds;
  if (unclampedRemaining > 0) return false;
  return unclampedRemaining >= -Math.max(0, graceSeconds);
}

type AttemptTimingRow = {
  started_at: string;
  time_limit_seconds: number | null;
  remaining_seconds: number | null;
};

function normalizeAutosaveAnswers(
  answers: AutosaveInput["answers"],
  questionTypeMap: Map<string, QuestionType>,
): AttemptAnswerInput[] {
  const seen = new Set<string>();
  return answers.map((answer) => {
    if (seen.has(answer.questionId)) {
      throw new ServiceError(
        "ANSWER_DUPLICATE",
        "Duplicate question answer",
        400,
      );
    }
    seen.add(answer.questionId);
    const type = questionTypeMap.get(answer.questionId);
    if (!type) {
      throw new ServiceError("ANSWER_INVALID", "Invalid question", 400);
    }
    return normalizeAnswerPayload(answer, type);
  });
}

function normalizeSubmitAnswers(
  answers: AutosaveInput["answers"],
  gradingMap: Map<string, QuizQuestionGrading>,
): AttemptAnswerInput[] {
  const seen = new Set<string>();
  return answers.map((answer) => {
    if (seen.has(answer.questionId)) {
      throw new ServiceError(
        "ANSWER_DUPLICATE",
        "Duplicate question answer",
        400,
      );
    }
    seen.add(answer.questionId);
    const meta = gradingMap.get(answer.questionId);
    if (!meta) {
      throw new ServiceError("ANSWER_INVALID", "Invalid question", 400);
    }
    const normalized = normalizeAnswerPayload(answer, meta.type);
    if (
      normalized.selectedOptionIds?.some((id) => !meta.optionIds.includes(id))
    ) {
      throw new ServiceError("ANSWER_INVALID", "Invalid option", 400);
    }
    return normalized;
  });
}

function normalizeAnswerPayload(
  answer: AutosaveInput["answers"][number],
  type: QuestionType,
): AttemptAnswerInput {
  if (type === "short_answer") {
    if (answer.selectedOptionIds !== undefined) {
      throw new ServiceError("ANSWER_INVALID", "Invalid answer field", 400);
    }
    if (answer.textAnswer === undefined) {
      throw new ServiceError("ANSWER_INVALID", "Missing answer", 400);
    }
    const normalizedText = normalizeTextAnswer(answer.textAnswer);
    return {
      questionId: answer.questionId,
      selectedOptionIds: null,
      textAnswer: normalizedText,
    };
  }

  if (answer.textAnswer !== undefined) {
    throw new ServiceError("ANSWER_INVALID", "Invalid answer field", 400);
  }
  if (answer.selectedOptionIds === undefined) {
    throw new ServiceError("ANSWER_INVALID", "Missing answer", 400);
  }

  if (type === "mcq_single" && (answer.selectedOptionIds?.length ?? 0) > 1) {
    throw new ServiceError("ANSWER_INVALID", "Too many options selected", 400);
  }

  return {
    questionId: answer.questionId,
    selectedOptionIds: normalizeOptionIds(answer.selectedOptionIds),
    textAnswer: null,
  };
}

function normalizeOptionIds(ids: string[] | null): string[] | null {
  if (!ids) return null;
  const unique = Array.from(new Set(ids));
  unique.sort();
  return unique;
}

function normalizeTextAnswer(input: string | null): string | null {
  if (input === null) return null;
  const trimmed = input.trim();
  return trimmed.length ? trimmed : null;
}

function mergeAnswers(
  existing: AttemptAnswer[],
  incoming: AttemptAnswerInput[],
): Map<string, AttemptAnswerInput> {
  const map = new Map<string, AttemptAnswerInput>();
  existing.forEach((answer) => {
    map.set(answer.questionId, {
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds ?? null,
      textAnswer: answer.textAnswer ?? null,
    });
  });
  incoming.forEach((answer) => {
    map.set(answer.questionId, answer);
  });
  return map;
}

function gradeAnswers(
  gradingData: QuizQuestionGrading[],
  answerMap: Map<string, AttemptAnswerInput>,
): {
  gradedAnswers: GradedAnswerInput[];
  correctCount: number;
  scoreRaw: number;
  scorePercent: number;
} {
  let correctCount = 0;
  let scoreRaw = 0;
  let totalPossible = 0;
  const gradedAnswers = gradingData.map((question) => {
    const answer = answerMap.get(question.questionId);
    const selectedOptionIds = answer?.selectedOptionIds ?? null;
    const textAnswer = answer?.textAnswer ?? null;
    const questionScore =
      question.score !== null ? question.score : question.defaultScore;
    totalPossible += questionScore;
    let isCorrect = false;

    if (question.type === "short_answer") {
      isCorrect = matchesShortAnswer(textAnswer, question.shortAnswerKeys);
    } else {
      isCorrect = matchesOptions(selectedOptionIds, question.correctOptionIds);
    }

    const awardedScore = isCorrect ? questionScore : 0;
    if (isCorrect) correctCount += 1;
    scoreRaw += awardedScore;

    return {
      questionId: question.questionId,
      selectedOptionIds: selectedOptionIds ?? null,
      textAnswer: textAnswer ?? null,
      isCorrect,
      awardedScore,
    };
  });

  const scorePercent =
    totalPossible > 0
      ? Number(((scoreRaw / totalPossible) * 100).toFixed(2))
      : 0;
  return { gradedAnswers, correctCount, scoreRaw, scorePercent };
}

function matchesOptions(
  selectedOptionIds: string[] | null,
  correctOptionIds: string[],
): boolean {
  const selected = new Set(selectedOptionIds ?? []);
  const correct = new Set(correctOptionIds);
  if (selected.size !== correct.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}

function matchesShortAnswer(
  input: string | null,
  keys: Array<{ acceptableAnswer: string; caseSensitive: boolean }>,
): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  return keys.some((key) => {
    const target = key.caseSensitive
      ? key.acceptableAnswer
      : key.acceptableAnswer.toLowerCase();
    const value = key.caseSensitive ? trimmed : trimmed.toLowerCase();
    return value === target;
  });
}

type AttemptRowShape = {
  id: string;
  quiz_id: string;
  status: Attempt["status"];
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number | null;
  remaining_seconds: number | null;
  score_raw: number;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
};

function mapAttemptRow(row: AttemptRowShape): Attempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    timeLimitSeconds: row.time_limit_seconds,
    remainingSeconds: row.remaining_seconds,
    scoreRaw: Number(row.score_raw),
    scorePercent: Number(row.score_percent),
    correctCount: row.correct_count,
    totalQuestions: row.total_questions,
    xpEarned: row.xp_earned,
  };
}
