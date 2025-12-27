import { createHash } from "node:crypto";
import {
  type AttemptAnswerInput,
  createAttempt,
  findChallengeAttempt,
  findInProgressAttempt,
  type GradedAnswerInput,
  getAttemptById,
  getAttemptReviewMeta,
  getAttemptState as getAttemptStateRepo,
  getQuizAttemptMeta,
  getQuizSnapshotMeta,
  listAttemptAnswers,
  listAttemptHistory as listAttemptHistoryRepo,
  listAttemptReviewQuestions,
  listAttemptSnapshotQuestionIds,
  listQuestionReviewDetails,
  listQuizGradingData,
  listQuizGradingDataByQuestionIds,
  listQuizQuestionMetaByIds,
  type QuizQuestionGrading,
  rejudgeAttempt as rejudgeAttemptRepo,
  saveAttemptAnswers,
  submitAttempt as submitAttemptRepo,
} from "@/application/infra/db/attemptRepo";
import { listQuizStatusesByIds } from "@/application/infra/db/quizRepo";
import type {
  Attempt,
  AttemptAnswer,
  AttemptHistoryItem,
  AttemptHistoryKind,
  AttemptReviewStateResponse,
  AttemptStateResponse,
  AttemptStatus,
  AttemptSubjectScore,
} from "@/application/models/attempt";
import type { QuestionType } from "@/application/models/enums";
import { ServiceError } from "@/application/services/errors";

type StartAttemptResult = {
  attemptId: string;
  resumed: boolean;
  status: AttemptStatus;
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
  if (quizMeta.customQuizOwnerId && quizMeta.customQuizOwnerId !== userId) {
    throw new ServiceError("CUSTOM_QUIZ_FORBIDDEN", "Forbidden", 403);
  }
  if (quizMeta.totalQuestions <= 0) {
    throw new ServiceError("QUIZ_NO_QUESTIONS", "Quiz has no questions", 400);
  }

  if (quizMeta.isChallenge) {
    const existing = await findChallengeAttempt(userId, quizId);
    if (existing) {
      return { attemptId: existing.id, resumed: true, status: existing.status };
    }
  } else {
    const existing = await findInProgressAttempt(userId, quizId);
    if (existing) {
      return { attemptId: existing.id, resumed: true, status: existing.status };
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
  if (quizMeta.isChallenge) {
    const startAt = quizMeta.challengeStartAt;
    const endAt = quizMeta.challengeEndAt;
    if (!startAt || !endAt) {
      throw new ServiceError(
        "CHALLENGE_SCHEDULE_MISSING",
        "Challenge schedule missing",
        400,
      );
    }
    const now = Date.now();
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new ServiceError(
        "CHALLENGE_SCHEDULE_INVALID",
        "Challenge schedule invalid",
        400,
      );
    }
    if (now < startMs || now > endMs) {
      throw new ServiceError(
        "CHALLENGE_NOT_ACTIVE",
        "Thử thách chưa bắt đầu hoặc đã kết thúc.",
        409,
      );
    }
  }

  const created = await createAttempt({
    userId,
    quizId,
    challengeId: quizMeta.isChallenge ? quizId : null,
    customQuizId: quizMeta.customQuizId ?? null,
    timeLimitSeconds: timeLimitSeconds ?? null,
    remainingSeconds: timeLimitSeconds ?? null,
    totalQuestions: quizMeta.totalQuestions,
  });

  return { attemptId: created.id, resumed: false, status: created.status };
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

export async function getAttemptReviewState(
  userId: string,
  attemptId: string,
): Promise<AttemptReviewStateResponse> {
  const meta = await getAttemptReviewMeta(attemptId);
  if (!meta) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (meta.attemptRow.user_id !== userId) {
    throw new ServiceError("ATTEMPT_FORBIDDEN", "Forbidden", 403);
  }

  const attempt = mapAttemptRow(meta.attemptRow);
  const judgementVersion = meta.attemptRow.judgement_version ?? 1;

  const [answers, snapshotQuestions] = await Promise.all([
    listAttemptAnswers(attemptId),
    listAttemptReviewQuestions(attemptId, judgementVersion),
  ]);

  const reviewMode = snapshotQuestions.length ? "snapshot" : "legacy";
  let questions =
    reviewMode === "snapshot"
      ? snapshotQuestions
      : await (async () => {
          const fallback = await getAttemptStateRepo(attemptId);
          if (!fallback) return [];
          return fallback.questions.map((question) => ({
            id: question.id,
            position: question.position,
            type: question.type,
            exists: true,
            stem: question.stem,
            explanation: null,
            correctOptionIds: [],
            shortAnswerKeys: [],
            passage: question.passage,
            options: question.options,
          }));
        })();

  if (reviewMode === "legacy" && questions.length) {
    const details = await listQuestionReviewDetails(questions.map((q) => q.id));
    const detailsById = new Map(details.map((row) => [row.questionId, row]));
    questions = questions.map((question) => {
      const detail = detailsById.get(question.id);
      if (!detail) return question;
      return {
        ...question,
        explanation: detail.explanation,
        correctOptionIds: detail.correctOptionIds,
        shortAnswerKeys: detail.shortAnswerKeys,
      };
    });
  }

  const quizContentHashSnapshot =
    meta.attemptRow.quiz_content_hash_snapshot ?? null;
  const quizContentHashCurrent = await (async () => {
    if (!meta.quizExists) return null;
    if (!quizContentHashSnapshot) return null;
    if (!questions.length) return null;
    const grading = await listQuizGradingDataByQuestionIds(
      meta.attemptRow.quiz_id,
      questions.map((q) => q.id),
    );
    if (!grading.length) return null;
    return computeQuizContentHashSnapshot(grading);
  })();

  const quizContentChanged =
    Boolean(quizContentHashSnapshot) &&
    Boolean(quizContentHashCurrent) &&
    quizContentHashSnapshot !== quizContentHashCurrent;

  const subjectScores = parseAttemptSubjectScores(
    meta.attemptRow.snapshot_subject_scores,
  );
  const subjectScoresEstimated =
    meta.attemptRow.snapshot_subject_scores !== null
      ? meta.attemptRow.snapshot_subject_scores_estimated
      : answers.length === 0;

  return {
    reviewMode,
    attempt,
    ownerId: meta.attemptRow.user_id,
    quizId: meta.attemptRow.quiz_id,
    quizTitle: meta.quizTitle,
    quizExists: meta.quizExists,
    judgementVersion,
    judgedAt: meta.attemptRow.judged_at ?? meta.attemptRow.submitted_at ?? null,
    quizContentHashSnapshot,
    quizContentHashCurrent,
    quizContentChanged,
    subjectScores,
    subjectScoresEstimated,
    questions,
    answers,
  };
}

export async function listAttemptHistory(
  userId: string,
  params: {
    limit?: number;
    offset?: number;
    search?: string;
    kind?: AttemptHistoryKind;
  } = {},
): Promise<{ items: AttemptHistoryItem[]; total: number }> {
  const result = await listAttemptHistoryRepo({
    userId,
    limit: params.limit,
    offset: params.offset,
    search: params.search,
    kind: params.kind,
  });
  if (!result.items.length) return { items: [], total: result.total };

  const quizIds = Array.from(new Set(result.items.map((item) => item.quizId)));
  const statuses = await listQuizStatusesByIds(quizIds);
  const statusById = new Map(statuses.map((row) => [row.id, row.status]));

  const items: AttemptHistoryItem[] = result.items.map((item) => {
    const status = statusById.get(item.quizId);
    const quizExists = status !== undefined;
    const canRedo = status === "published";
    return {
      ...item,
      quizExists,
      canRedo,
    };
  });

  return { items, total: result.total };
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

  const normalized = await (async () => {
    if (!input.answers.length) return [];
    const questionIds = Array.from(
      new Set(input.answers.map((answer) => answer.questionId)),
    );
    const questionMeta = await listQuizQuestionMetaByIds(
      attempt.quiz_id,
      questionIds,
    );
    const questionTypeMap = new Map(
      questionMeta.map((item) => [item.questionId, item.type]),
    );
    return normalizeAutosaveAnswers(input.answers, questionTypeMap);
  })();
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
  const quizMetaForSnapshot = await getQuizSnapshotMeta(attempt.quiz_id);
  if (!quizMetaForSnapshot) {
    throw new ServiceError("QUIZ_NOT_FOUND", "Quiz not found", 404);
  }

  const questionSnapshots = buildQuestionSnapshots(gradingData);
  const subjectScores = computeSubjectScores(gradingData, gradedAnswers);
  const quizContentHash = computeQuizContentHashSnapshot(gradingData);

  const result = await submitAttemptRepo({
    attemptId,
    gradedAnswers,
    scoreRaw,
    scorePercent,
    correctCount,
    totalQuestions: gradingData.length,
    remainingSeconds,
    xpEvent: {
      userId,
      source: attempt.challenge_id ? "challenge" : "attempt",
      amount: xpEarned,
      metadata: { quizId: attempt.quiz_id },
    },
    snapshot: {
      quizContentHash,
      quizTitle: quizMetaForSnapshot.title,
      quizDifficultyLevel: quizMetaForSnapshot.difficultyLevel,
      quizEstimatedTimeSeconds: quizMetaForSnapshot.estimatedTimeSeconds,
      isChallenge: quizMetaForSnapshot.isChallenge,
      subjectScores,
      subjectScoresEstimated: false,
    },
    questionSnapshots,
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

export async function rejudgeAttempt(
  userId: string,
  attemptId: string,
): Promise<{ attempt: Attempt; judgementVersion: number }> {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (attempt.user_id !== userId) {
    throw new ServiceError("ATTEMPT_FORBIDDEN", "Forbidden", 403);
  }
  if (attempt.status !== "submitted" && attempt.status !== "auto_submitted") {
    throw new ServiceError(
      "ATTEMPT_NOT_SUBMITTED",
      "Attempt not submitted",
      409,
    );
  }

  const quizMetaForSnapshot = await getQuizSnapshotMeta(attempt.quiz_id);
  if (!quizMetaForSnapshot) {
    throw new ServiceError(
      "QUIZ_NOT_FOUND",
      "Quiz not found (it may have been deleted)",
      404,
    );
  }

  const [attemptAnswers, snapshotQuestionIds] = await Promise.all([
    listAttemptAnswers(attemptId),
    listAttemptSnapshotQuestionIds(attemptId, attempt.judgement_version ?? 1),
  ]);

  const baselineQuestionIds =
    snapshotQuestionIds.length > 0
      ? snapshotQuestionIds
      : attemptAnswers.map((answer) => answer.questionId);

  const gradingData = await listQuizGradingDataByQuestionIds(
    attempt.quiz_id,
    baselineQuestionIds,
  );
  if (!gradingData.length) {
    throw new ServiceError(
      "REJUDGE_NO_SHARED_QUESTIONS",
      "Không thể chấm lại: quiz không còn chứa câu hỏi nào trong lượt làm này.",
      409,
    );
  }

  const answerMap = new Map<string, AttemptAnswerInput>();
  attemptAnswers.forEach((answer) => {
    answerMap.set(answer.questionId, {
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds ?? null,
      textAnswer: answer.textAnswer ?? null,
    });
  });

  const { gradedAnswers, correctCount, scoreRaw, scorePercent } = gradeAnswers(
    gradingData,
    answerMap,
  );

  const xpEarned = Math.round(scorePercent);
  const xpDelta = xpEarned - Number(attempt.xp_earned ?? 0);

  const questionSnapshots = buildQuestionSnapshots(gradingData);
  const subjectScores = computeSubjectScores(gradingData, gradedAnswers);
  const quizContentHash = computeQuizContentHashSnapshot(gradingData);

  const result = await rejudgeAttemptRepo({
    attemptId,
    expectedJudgementVersion: attempt.judgement_version ?? 1,
    gradedAnswers: gradedAnswers.map((answer) => ({
      questionId: answer.questionId,
      isCorrect: answer.isCorrect,
      awardedScore: answer.awardedScore,
    })),
    scoreRaw,
    scorePercent,
    correctCount,
    totalQuestions: gradingData.length,
    xpEarned,
    xpAdjustmentEvent:
      xpDelta !== 0
        ? {
            userId,
            source: "admin_adjust",
            amount: xpDelta,
            metadata: {
              quizId: attempt.quiz_id,
              attemptId,
              reason: "rejudge",
            },
          }
        : null,
    snapshot: {
      quizContentHash,
      quizTitle: quizMetaForSnapshot.title,
      quizDifficultyLevel: quizMetaForSnapshot.difficultyLevel,
      quizEstimatedTimeSeconds: quizMetaForSnapshot.estimatedTimeSeconds,
      isChallenge: quizMetaForSnapshot.isChallenge,
      subjectScores,
      subjectScoresEstimated: false,
    },
    questionSnapshots,
  });

  if (result.status === "not_found") {
    throw new ServiceError("ATTEMPT_NOT_FOUND", "Attempt not found", 404);
  }
  if (result.status === "not_submitted") {
    throw new ServiceError(
      "ATTEMPT_NOT_SUBMITTED",
      "Attempt not submitted",
      409,
    );
  }
  if (result.status === "conflict") {
    throw new ServiceError(
      "REJUDGE_CONFLICT",
      "Attempt was updated, please retry rejudge",
      409,
    );
  }

  return { attempt: result.attempt, judgementVersion: result.judgementVersion };
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

function buildQuestionSnapshots(gradingData: QuizQuestionGrading[]): Array<{
  questionId: string;
  questionType: QuestionType;
  position: number;
  maxScore: number;
  required: boolean;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  questionUpdatedAt: string;
}> {
  return gradingData.map((question) => {
    const maxScore =
      question.score !== null ? question.score : question.defaultScore;
    return {
      questionId: question.questionId,
      questionType: question.type,
      position: question.position,
      maxScore,
      required: question.required,
      subjectId: question.subjectId,
      subjectName: question.subjectName,
      subjectSlug: question.subjectSlug,
      questionUpdatedAt: question.questionUpdatedAt,
    };
  });
}

function computeSubjectScores(
  gradingData: QuizQuestionGrading[],
  gradedAnswers: GradedAnswerInput[],
): AttemptSubjectScore[] {
  const gradedMap = new Map<
    string,
    { awardedScore: number; isCorrect: boolean }
  >();
  gradedAnswers.forEach((answer) => {
    gradedMap.set(answer.questionId, {
      awardedScore: answer.awardedScore,
      isCorrect: answer.isCorrect,
    });
  });

  const bySubject = new Map<
    string,
    {
      subjectId: string;
      name: string;
      slug: string;
      totalQuestions: number;
      correctCount: number;
      totalPossible: number;
      awarded: number;
    }
  >();

  gradingData.forEach((question) => {
    const subjectId = question.subjectId;
    const agg = bySubject.get(subjectId) ?? {
      subjectId,
      name: question.subjectName,
      slug: question.subjectSlug,
      totalQuestions: 0,
      correctCount: 0,
      totalPossible: 0,
      awarded: 0,
    };
    const maxScore =
      question.score !== null ? question.score : question.defaultScore;
    agg.totalQuestions += 1;
    agg.totalPossible += maxScore;
    const graded = gradedMap.get(question.questionId);
    if (graded) {
      agg.awarded += graded.awardedScore;
      if (graded.isCorrect) agg.correctCount += 1;
    }
    bySubject.set(subjectId, agg);
  });

  const scores: AttemptSubjectScore[] = Array.from(bySubject.values()).map(
    (agg) => ({
      subjectId: agg.subjectId,
      name: agg.name,
      slug: agg.slug,
      correctCount: agg.correctCount,
      totalQuestions: agg.totalQuestions,
      scorePercent:
        agg.totalPossible > 0
          ? Number(((agg.awarded / agg.totalPossible) * 100).toFixed(2))
          : 0,
    }),
  );

  scores.sort((a, b) => {
    if (b.scorePercent !== a.scorePercent)
      return b.scorePercent - a.scorePercent;
    if (b.totalQuestions !== a.totalQuestions)
      return b.totalQuestions - a.totalQuestions;
    return a.name.localeCompare(b.name, "vi");
  });

  return scores;
}

function parseAttemptSubjectScores(raw: unknown): AttemptSubjectScore[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const subjectId =
        typeof record.subjectId === "string" ? record.subjectId : null;
      const name = typeof record.name === "string" ? record.name : null;
      const slug = typeof record.slug === "string" ? record.slug : null;
      if (!subjectId || !name || !slug) return null;
      const correctCount = Number(record.correctCount ?? 0);
      const totalQuestions = Number(record.totalQuestions ?? 0);
      const scorePercent = Number(record.scorePercent ?? 0);
      return {
        subjectId,
        name,
        slug,
        correctCount: Number.isFinite(correctCount) ? correctCount : 0,
        totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : 0,
        scorePercent: Number.isFinite(scorePercent) ? scorePercent : 0,
      };
    })
    .filter((item): item is AttemptSubjectScore => item !== null);
}

function computeQuizContentHashSnapshot(gradingData: QuizQuestionGrading[]) {
  const parts = gradingData.map((question) => {
    const score = question.score === null ? "null" : String(question.score);
    return [
      question.position,
      question.questionId,
      question.type,
      question.required ? 1 : 0,
      score,
      question.defaultScore,
      question.questionUpdatedAt,
    ].join("|");
  });
  return createHash("sha256").update(parts.join("\n")).digest("hex");
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
