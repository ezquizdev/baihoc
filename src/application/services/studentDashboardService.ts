import { getActiveChallengePreviewForUser } from "@/application/infra/db/studentDashboardRepo";
import type { StudentDashboardDailyChallengeCardDto } from "@/application/models/studentDashboard";

function truncate(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export async function getStudentDashboardDailyChallengeCard(
  userId: string,
): Promise<StudentDashboardDailyChallengeCardDto> {
  const preview = await getActiveChallengePreviewForUser(userId);
  if (!preview) return { status: "none" };

  const canStart = Boolean(preview.attempt) || Boolean(preview.question);

  const questionText = preview.question?.stem
    ? truncate(preview.question.stem, 180)
    : "Challenge hôm nay chưa có câu hỏi.";

  const answers = (() => {
    const question = preview.question;
    if (!question) return [];
    if (question.type === "short_answer") return ["Tự luận"];
    return question.options.map((opt) => truncate(opt.content, 80)).slice(0, 4);
  })();

  const actionLabel = (() => {
    if (!canStart) return "Chưa có câu hỏi";
    const status = preview.attempt?.status;
    if (status === "in_progress") return "Tiếp tục";
    if (status === "submitted" || status === "auto_submitted")
      return "Xem kết quả";
    return "Bắt đầu";
  })();

  return {
    status: "active",
    quizId: preview.quizId,
    quizTitle: preview.quizTitle,
    question: questionText,
    answers,
    actionLabel,
    actionHref: canStart ? `/quizzes/${preview.quizId}/attempt` : undefined,
  };
}
