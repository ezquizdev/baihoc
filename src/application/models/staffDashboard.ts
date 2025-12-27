export type StaffDashboardSubjectDto = {
  id: string;
  name: string;
  slug: string;
};

export type StaffDashboardStatsDto = {
  studentCount: number;
  quizCount: number;
  challengeCount: number;
  questionCount: number;
  attemptsTodayCount: number;
  mostWrongTopic: {
    subjectName: string;
    subjectSlug: string;
    topicName: string;
    wrongCount: number;
  } | null;
};

export type StaffDashboardActivityItemDto = {
  id: string;
  occurredAt: string;
  occurredAtRelative: string;
  summary: string;
};

export type StaffDashboardLeaderboardEntryDto = {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  score: number;
};

export type StaffDashboardDistributionBucketDto = {
  label: string;
  count: number;
};

export type StaffDashboardCompetencyDto = {
  averageScore: number;
  buckets: StaffDashboardDistributionBucketDto[];
};

export type StaffDashboardSubjectCompetencyCardDto = {
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  averageScore: number;
  buckets: StaffDashboardDistributionBucketDto[];
  hasEnoughData: boolean;
};

export type StaffDashboardSectionResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

export type StaffDashboardOverviewDto = {
  stats: StaffDashboardSectionResult<StaffDashboardStatsDto>;
  activity: StaffDashboardSectionResult<{
    items: StaffDashboardActivityItemDto[];
  }>;
  leaderboard: StaffDashboardSectionResult<{
    entries: StaffDashboardLeaderboardEntryDto[];
  }>;
  competency: StaffDashboardSectionResult<{
    overall: StaffDashboardCompetencyDto;
    subjects: StaffDashboardSubjectCompetencyCardDto[];
  }>;
};

export type StaffDashboardChartSeriesDto = {
  subjectSlug: string;
  values: Array<number | null>;
};

export type StaffDashboardLineChartDto = {
  dates: string[];
  labels: string[];
  series: StaffDashboardChartSeriesDto[];
};

export type StaffDashboardChartsDto = {
  windowDays: number;
  frequency: StaffDashboardLineChartDto;
  accuracy: StaffDashboardLineChartDto;
};
