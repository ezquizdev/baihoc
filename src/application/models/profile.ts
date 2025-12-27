export type ProfileWeeklyBarDto = {
  label: string;
  correct: number;
  wrong: number;
};

export type ProfileStatsDto = {
  completedQuizCount: number;
  activeDays30d: number;
  studySeconds: number;
  averageScorePercent: number;
  weeklyBars: ProfileWeeklyBarDto[];
};

export type ProfileXpSummaryDto = {
  totalXp: number;
  xpVi: number;
  xpEn: number;
  xpMath: number;
  xpSci: number;
};

export type SelfProfileOverviewDto = {
  stats: ProfileStatsDto;
  xp: ProfileXpSummaryDto;
};
