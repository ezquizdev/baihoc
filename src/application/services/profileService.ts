import {
  getProfileAggregates,
  getUserXpSummary,
  listWeeklyAnswerCounts,
} from "@/application/infra/db/profileRepo";
import type {
  ProfileStatsDto,
  SelfProfileOverviewDto,
} from "@/application/models/profile";

function dayLabelFromDow(dow: number) {
  // Postgres DOW: 0=Sunday ... 6=Saturday
  if (dow === 0) return "CN";
  return `T${dow + 1}`;
}

export async function getSelfProfileOverview(
  userId: string,
): Promise<SelfProfileOverviewDto> {
  const [xp, aggregates, weekly] = await Promise.all([
    getUserXpSummary(userId),
    getProfileAggregates(userId),
    listWeeklyAnswerCounts(userId),
  ]);

  if (!xp) {
    throw new Error("Không tìm thấy người dùng");
  }

  const weeklyBars: ProfileStatsDto["weeklyBars"] = weekly.map((row) => ({
    label: dayLabelFromDow(row.dow),
    correct: row.correct,
    wrong: row.wrong,
  }));

  return {
    xp,
    stats: {
      completedQuizCount: aggregates.completedQuizCount,
      activeDays30d: aggregates.activeDays30d,
      studySeconds: aggregates.studySeconds,
      averageScorePercent: aggregates.averageScorePercent,
      weeklyBars,
    },
  };
}
