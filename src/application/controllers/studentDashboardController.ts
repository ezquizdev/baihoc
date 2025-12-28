import type { StudentDashboardDailyChallengeCardDto } from "@/application/models/studentDashboard";
import { getStudentDashboardDailyChallengeCard } from "@/application/services/studentDashboardService";

export async function controllerGetStudentDashboardDailyChallengeCard(
  userId: string,
): Promise<StudentDashboardDailyChallengeCardDto> {
  return getStudentDashboardDailyChallengeCard(userId);
}
