import {
  getAttemptsTodayCount,
  getMostWrongTopic,
  getQuestionCount,
  getQuizAndChallengeCounts,
  getStudentCount,
  listRecentAttempts,
  listStudentSubjectXpTotals,
  listStudentXpTotals,
} from "@/application/infra/db/staffDashboardRepo";
import type {
  StaffDashboardActivityItemDto,
  StaffDashboardCompetencyDto,
  StaffDashboardDistributionBucketDto,
  StaffDashboardLeaderboardEntryDto,
  StaffDashboardOverviewDto,
  StaffDashboardSectionResult,
  StaffDashboardStatsDto,
  StaffDashboardSubjectCompetencyCardDto,
} from "@/application/models/staffDashboard";
import type { Subject } from "@/application/models/subject";
import { formatRelativeTimeVi } from "@/lib/formatters";

type XpBucketConfig = {
  label: string;
  min: number;
};

export const overallXpBuckets: XpBucketConfig[] = [
  { label: "1000+", min: 1000 },
  { label: "900+", min: 900 },
  { label: "800+", min: 800 },
  { label: "<800", min: 0 },
];

export const defaultSubjectXpBuckets: XpBucketConfig[] = [
  { label: "250+", min: 250 },
  { label: "225+", min: 225 },
  { label: "200+", min: 200 },
  { label: "<200", min: 0 },
];

export const subjectXpBucketBySlug: Record<string, XpBucketConfig[]> = {
  vi: defaultSubjectXpBuckets,
  en: defaultSubjectXpBuckets,
  math: defaultSubjectXpBuckets,
  sci: defaultSubjectXpBuckets,
};

export function getSubjectXpBuckets(slug: string) {
  return subjectXpBucketBySlug[slug] ?? defaultSubjectXpBuckets;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "unknown_error";
}

function settledToSectionResult<T>(
  settled: PromiseSettledResult<StaffDashboardSectionResult<T>>,
): StaffDashboardSectionResult<T> {
  if (settled.status === "fulfilled") return settled.value;
  return { status: "error", message: safeErrorMessage(settled.reason) };
}

function computeDistributionBuckets(
  scores: number[],
  buckets: XpBucketConfig[],
): StaffDashboardDistributionBucketDto[] {
  const counts = buckets.map(() => 0);

  scores.forEach((score) => {
    const bucketIndex = buckets.findIndex((bucket) => score >= bucket.min);
    if (bucketIndex === -1) return;
    counts[bucketIndex] += 1;
  });

  return buckets.map((bucket, index) => ({
    label: bucket.label,
    count: counts[index] ?? 0,
  }));
}

function computeAverageScore(scores: number[]) {
  if (!scores.length) return 0;
  const total = scores.reduce((sum, value) => sum + value, 0);
  return Math.round(total / scores.length);
}

function computeCompetency(
  scores: number[],
  buckets: XpBucketConfig[],
): StaffDashboardCompetencyDto {
  return {
    averageScore: computeAverageScore(scores),
    buckets: computeDistributionBuckets(scores, buckets),
  };
}

type StaffDashboardOverviewInput = {
  leaderboardLimit: number;
  activityLimit: number;
  subjects: Subject[];
};

export async function getStaffDashboardOverview({
  leaderboardLimit,
  activityLimit,
  subjects,
}: StaffDashboardOverviewInput): Promise<StaffDashboardOverviewDto> {
  const orderedSubjects = orderSubjectsForDashboard(subjects);
  const xpTotalsPromise = listStudentXpTotals();
  const subjectIds = orderedSubjects.map((subject) => subject.id);
  const subjectTotalsPromise = subjectIds.length
    ? listStudentSubjectXpTotals(subjectIds)
    : Promise.resolve([]);

  const [stats, activity, leaderboard, competency] = await Promise.allSettled([
    buildStatsSection(),
    buildActivitySection(activityLimit),
    buildLeaderboardSection(leaderboardLimit, xpTotalsPromise),
    buildCompetencySection(
      orderedSubjects,
      xpTotalsPromise,
      subjectTotalsPromise,
    ),
  ]);

  return {
    stats: settledToSectionResult(stats),
    activity: settledToSectionResult(activity),
    leaderboard: settledToSectionResult(leaderboard),
    competency: settledToSectionResult(competency),
  };
}

function orderSubjectsForDashboard(subjects: Subject[]) {
  const preferredSlugs = ["vi", "en", "math", "sci"];
  const order = new Map(preferredSlugs.map((slug, index) => [slug, index]));
  return [...subjects].sort((a, b) => {
    const aOrder = order.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "vi-VN");
  });
}

async function buildStatsSection(): Promise<
  StaffDashboardSectionResult<StaffDashboardStatsDto>
> {
  try {
    const [studentCount, questionCount, quizCounts, attemptsTodayCount, topic] =
      await Promise.all([
        getStudentCount(),
        getQuestionCount(),
        getQuizAndChallengeCounts(),
        getAttemptsTodayCount(),
        getMostWrongTopic(7),
      ]);

    return {
      status: "ok",
      data: {
        studentCount,
        quizCount: quizCounts.quizCount,
        challengeCount: quizCounts.challengeCount,
        questionCount,
        attemptsTodayCount,
        mostWrongTopic: topic,
      },
    };
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }
}

async function buildActivitySection(
  limit: number,
): Promise<
  StaffDashboardSectionResult<{ items: StaffDashboardActivityItemDto[] }>
> {
  try {
    const attempts = await listRecentAttempts(limit);
    const items = attempts.map((attempt) => ({
      id: attempt.attemptId,
      occurredAt: attempt.submittedAt,
      occurredAtRelative: formatRelativeTimeVi(attempt.submittedAt),
      summary: attempt.isChallenge
        ? `Đang challenge: ${attempt.quizTitle}`
        : `Làm bài: ${attempt.studentName} làm quiz “${attempt.quizTitle}”`,
    }));

    return { status: "ok", data: { items } };
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }
}

async function buildLeaderboardSection(
  limit: number,
  xpTotalsPromise: ReturnType<typeof listStudentXpTotals>,
): Promise<
  StaffDashboardSectionResult<{ entries: StaffDashboardLeaderboardEntryDto[] }>
> {
  try {
    const totals = await xpTotalsPromise;
    const sorted = [...totals].sort((a, b) => b.xpTotal - a.xpTotal);
    const entries = sorted.slice(0, limit).map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      score: row.xpTotal,
    }));

    return { status: "ok", data: { entries } };
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }
}

async function buildCompetencySection(
  subjects: Subject[],
  xpTotalsPromise: ReturnType<typeof listStudentXpTotals>,
  subjectTotalsPromise:
    | ReturnType<typeof listStudentSubjectXpTotals>
    | Promise<[]>,
): Promise<
  StaffDashboardSectionResult<{
    overall: StaffDashboardCompetencyDto;
    subjects: StaffDashboardSubjectCompetencyCardDto[];
  }>
> {
  try {
    const [xpTotals, subjectTotals] = await Promise.all([
      xpTotalsPromise,
      subjectTotalsPromise,
    ]);

    const overallScores = xpTotals.map((row) => row.xpTotal);
    const overall = computeCompetency(overallScores, overallXpBuckets);

    const totalsBySubjectId = new Map<string, Map<string, number>>();
    const subjectsWithAnyData = new Set<string>();

    subjectTotals.forEach((row) => {
      subjectsWithAnyData.add(row.subjectId);
      const existing = totalsBySubjectId.get(row.subjectId) ?? new Map();
      existing.set(row.userId, row.xpTotal);
      totalsBySubjectId.set(row.subjectId, existing);
    });

    const subjectCards = subjects.map((subject) => {
      const perStudent = totalsBySubjectId.get(subject.id) ?? new Map();
      const scores = xpTotals.map(
        (student) => perStudent.get(student.userId) ?? 0,
      );
      const buckets = getSubjectXpBuckets(subject.slug);
      const competency = computeCompetency(scores, buckets);

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectSlug: subject.slug,
        averageScore: competency.averageScore,
        buckets: competency.buckets,
        hasEnoughData: subjectsWithAnyData.has(subject.id),
      };
    });

    const hasAnySubjectData = subjectTotals.length > 0;
    const normalizedSubjectCards = hasAnySubjectData
      ? subjectCards
      : subjectCards.map((card) => ({ ...card, hasEnoughData: false }));

    return {
      status: "ok",
      data: { overall, subjects: normalizedSubjectCards },
    };
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }
}
