import {
  getProfileAggregates,
  getUserXpSummary,
  listWeeklyAnswerCounts,
} from "@/application/infra/db/profileRepo";
import { findUserById } from "@/application/infra/db/userRepo";
import type {
  ProfileStatsDto,
  PublicProfileOverviewDto,
  SelfProfileOverviewDto,
} from "@/application/models/profile";
import type { UserRole } from "@/application/models/user";
import { ServiceError } from "@/application/services/errors";

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

export async function getPublicProfileOverview(input: {
  viewerRole: UserRole;
  targetUserId: string;
}): Promise<PublicProfileOverviewDto> {
  const user = await findUserById(input.targetUserId);
  if (!user) {
    throw new ServiceError("USER_NOT_FOUND", "Không tìm thấy người dùng", 404);
  }

  if (input.viewerRole === "student") {
    const allowed = user.role === "student" && user.status === "active";
    if (!allowed) {
      throw new ServiceError(
        "USER_NOT_FOUND",
        "Không tìm thấy người dùng",
        404,
      );
    }
  }

  const overview = await getSelfProfileOverview(user.id);

  return {
    user: {
      id: user.id,
      fullName: user.full_name ?? "",
      avatarUrl: user.avatar_url ?? null,
      school: user.school ?? "",
      dateOfBirth: user.date_of_birth ?? "",
      role: user.role,
      profileCompleted: user.profile_completed,
    },
    stats: overview.stats,
    xp: overview.xp,
  };
}
