import {
  createOrGetHighlightSubmission,
  getActiveHighlightCardSnapshotForUser,
} from "@/application/infra/db/highlightChallengeRepo";
import type {
  HighlightChallengeSubmitResultDto,
  StudentDashboardHighlightChallengeCardDto,
} from "@/application/models/studentDashboard";
import { ServiceError } from "@/application/services/errors";

function isSupportedHighlightQuestionType(type: string) {
  return type === "mcq_single" || type === "mcq_multi";
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function actionLabelForAttemptStatus(status: string | null | undefined) {
  if (status === "in_progress") return "Tiếp tục";
  if (status) return "Xem kết quả";
  return "Bắt đầu";
}

export async function getStudentDashboardHighlightChallengeCard(
  userId: string,
): Promise<StudentDashboardHighlightChallengeCardDto> {
  const snapshot = await getActiveHighlightCardSnapshotForUser(userId);
  if (!snapshot) return { status: "none" };

  if (!isSupportedHighlightQuestionType(snapshot.question.type)) {
    return { status: "none" };
  }

  const actionHref = `/quizzes/${snapshot.quizId}/attempt`;
  const actionLabel = actionLabelForAttemptStatus(snapshot.attempt?.status);

  const correctOptionIds = snapshot.question.options
    .filter((opt) => opt.isCorrect)
    .map((opt) => opt.id);

  return {
    status: "active",
    quizId: snapshot.quizId,
    quizTitle: snapshot.quizTitle,
    startAt: snapshot.startAt,
    endAt: snapshot.endAt,
    question: {
      id: snapshot.question.id,
      stem: snapshot.question.stem,
      type: snapshot.question.type,
      explanation: snapshot.question.explanation,
    },
    options: snapshot.question.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      position: opt.position,
    })),
    submission: snapshot.submission,
    ...(snapshot.submission ? { correctOptionIds } : {}),
    attempt: snapshot.attempt,
    actionLabel,
    actionHref,
  };
}

export async function submitStudentDashboardHighlightChallengeAnswer(
  userId: string,
  input: { selectedOptionIds: unknown },
): Promise<HighlightChallengeSubmitResultDto> {
  const snapshot = await getActiveHighlightCardSnapshotForUser(userId);
  if (!snapshot) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_NOT_AVAILABLE",
      "Highlight challenge không khả dụng (có thể đã hết thời gian).",
      404,
    );
  }

  if (!isSupportedHighlightQuestionType(snapshot.question.type)) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_UNSUPPORTED",
      "Highlight challenge hiện chỉ hỗ trợ câu hỏi trắc nghiệm.",
      409,
    );
  }

  const correctOptionIds = snapshot.question.options
    .filter((opt) => opt.isCorrect)
    .map((opt) => opt.id);

  const actionHref = `/quizzes/${snapshot.quizId}/attempt`;
  const actionLabel = actionLabelForAttemptStatus(snapshot.attempt?.status);

  if (snapshot.submission) {
    return {
      quizId: snapshot.quizId,
      questionId: snapshot.question.id,
      questionType: snapshot.question.type,
      selectedOptionIds: snapshot.submission.selectedOptionIds,
      correctOptionIds,
      isCorrect: snapshot.submission.isCorrect,
      explanation: snapshot.question.explanation,
      actionLabel,
      actionHref,
    };
  }

  const selectedOptionIds = uniqueStrings(input.selectedOptionIds);
  if (selectedOptionIds.length === 0) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_NO_SELECTION",
      "Bạn chưa chọn đáp án.",
      400,
    );
  }

  const allowedOptionIds = new Set(
    snapshot.question.options.map((opt) => opt.id),
  );
  for (const id of selectedOptionIds) {
    if (!allowedOptionIds.has(id)) {
      throw new ServiceError(
        "HIGHLIGHT_CHALLENGE_INVALID_SELECTION",
        "Đáp án không hợp lệ.",
        400,
      );
    }
  }

  if (
    snapshot.question.type === "mcq_single" &&
    selectedOptionIds.length !== 1
  ) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_INVALID_SELECTION",
      "Câu hỏi này chỉ chọn 1 đáp án.",
      400,
    );
  }

  const normalize = (ids: string[]) => ids.slice().sort();
  const isCorrect =
    normalize(selectedOptionIds).join("|") ===
    normalize(correctOptionIds).join("|");

  const stored = await createOrGetHighlightSubmission({
    userId,
    quizId: snapshot.quizId,
    questionId: snapshot.question.id,
    selectedOptionIds,
    isCorrect,
  });

  if (!stored) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_SUBMIT_FAILED",
      "Không thể lưu câu trả lời.",
      500,
    );
  }

  return {
    quizId: snapshot.quizId,
    questionId: snapshot.question.id,
    questionType: snapshot.question.type,
    selectedOptionIds: stored.selectedOptionIds,
    correctOptionIds,
    isCorrect: stored.isCorrect,
    explanation: snapshot.question.explanation,
    actionLabel,
    actionHref,
  };
}
