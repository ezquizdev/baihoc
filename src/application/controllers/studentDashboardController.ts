import type {
  HighlightChallengeSubmitResultDto,
  StudentDashboardHighlightChallengeCardDto,
} from "@/application/models/studentDashboard";
import {
  getStudentDashboardHighlightChallengeCard,
  submitStudentDashboardHighlightChallengeAnswer,
} from "@/application/services/studentDashboardService";

export async function controllerGetStudentDashboardHighlightChallengeCard(
  userId: string,
): Promise<StudentDashboardHighlightChallengeCardDto> {
  return getStudentDashboardHighlightChallengeCard(userId);
}

export async function controllerSubmitStudentDashboardHighlightChallengeAnswer(
  userId: string,
  input: { selectedOptionIds: unknown },
): Promise<HighlightChallengeSubmitResultDto> {
  return submitStudentDashboardHighlightChallengeAnswer(userId, input);
}
