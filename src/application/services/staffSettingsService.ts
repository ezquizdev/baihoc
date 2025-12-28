import {
  getActiveChallengeWindowById,
  getChallengeQuestionForHighlight,
  getHighlightConfig,
  listActiveChallenges,
  upsertHighlightConfig,
} from "@/application/infra/db/highlightChallengeRepo";
import type { StaffHighlightChallengeSettingsDto } from "@/application/models/staffSettings";
import { ServiceError } from "@/application/services/errors";

export async function getStaffHighlightChallengeSettings(): Promise<StaffHighlightChallengeSettingsDto> {
  const [config, activeChallenges] = await Promise.all([
    getHighlightConfig(),
    listActiveChallenges(),
  ]);

  const normalizedConfig = config?.quizId && config?.questionId ? config : null;

  return {
    config: normalizedConfig,
    activeChallenges,
  };
}

export async function setStaffHighlightChallengeSettings(input: {
  staffUserId: string;
  quizId: string | null;
  questionId: string | null;
}) {
  const hasQuiz = Boolean(input.quizId);
  const hasQuestion = Boolean(input.questionId);
  if (hasQuiz !== hasQuestion) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_INVALID_INPUT",
      "Cần chọn cả challenge và câu hỏi (hoặc xóa cả hai).",
      400,
    );
  }

  if (!input.quizId || !input.questionId) {
    await upsertHighlightConfig({
      quizId: null,
      questionId: null,
      updatedBy: input.staffUserId,
    });
    return { status: "cleared" as const };
  }

  const active = await getActiveChallengeWindowById(input.quizId);
  if (!active) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_NOT_ACTIVE",
      "Chỉ có thể chọn challenge đang diễn ra (trong khung giờ active).",
      409,
    );
  }

  const question = await getChallengeQuestionForHighlight({
    quizId: input.quizId,
    questionId: input.questionId,
  });
  if (!question) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_QUESTION_NOT_IN_QUIZ",
      "Câu hỏi không thuộc challenge này.",
      404,
    );
  }

  if (question.type !== "mcq_single" && question.type !== "mcq_multi") {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_QUESTION_UNSUPPORTED",
      "Chỉ hỗ trợ câu hỏi trắc nghiệm 1 đáp án hoặc nhiều đáp án.",
      409,
    );
  }

  const optionCount = question.options.length;
  const correctCount = question.options.filter((o) => o.isCorrect).length;
  if (optionCount === 0) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_OPTIONS_MISSING",
      "Câu hỏi chưa có đáp án.",
      409,
    );
  }
  if (correctCount === 0) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_OPTIONS_INVALID",
      "Câu hỏi chưa có đáp án đúng.",
      409,
    );
  }
  if (question.type === "mcq_single" && correctCount !== 1) {
    throw new ServiceError(
      "HIGHLIGHT_CHALLENGE_OPTIONS_INVALID",
      "Câu hỏi 1 đáp án phải có đúng 1 đáp án đúng.",
      409,
    );
  }

  await upsertHighlightConfig({
    quizId: input.quizId,
    questionId: input.questionId,
    updatedBy: input.staffUserId,
  });

  return { status: "updated" as const };
}
