import { notFound, redirect } from "next/navigation";
import { controllerAdminGetUser } from "@/application/controllers/userAdminController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";
import { getPublicProfileOverview } from "@/application/services/profileService";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OtherUserProfileCard } from "@/components/profile/OtherUserProfileCard";
import { ProfileScoreCards } from "@/components/profile/ProfileScoreCards";
import { PublicProfileCard } from "@/components/profile/PublicProfileCard";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";
import { formatNumberVi, formatStudyTimeVi } from "@/lib/formatters";
import layoutStyles from "../profile-page.module.css";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { userId: string };

export default async function OtherProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { userId } = await params;
  if (!uuidRegex.test(userId)) {
    notFound();
  }

  const session = await requireAuthenticatedPage({
    next: `/profile/${userId}`,
  });
  if (userId === session.sub) {
    redirect("/profile");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  if (session.role === "staff") {
    try {
      const user = await controllerAdminGetUser(userId);
      return (
        <DashboardShell
          pageTitle="Hồ sơ"
          activeNav="profile"
          navItems={staffNavItems}
          userEmail={session.email}
          userName={displayName}
          avatarUrl={session.avatarUrl}
        >
          <OtherUserProfileCard user={user} />
        </DashboardShell>
      );
    } catch (error) {
      if (isServiceError(error) && error.status === 404) {
        notFound();
      }
      throw error;
    }
  }

  try {
    const overview = await getPublicProfileOverview({
      viewerRole: session.role,
      targetUserId: userId,
    });

    const stats = overview.stats;
    const xp = overview.xp;

    return (
      <DashboardShell
        pageTitle="Hồ sơ"
        activeNav="settings"
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
      >
        <section className={layoutStyles.pageGrid} aria-label="Hồ sơ học sinh">
          <div className={layoutStyles.leftColumn}>
            <PublicProfileCard user={overview.user} />
            <StatsCard
              title="Thống kê"
              progressValue={stats.activeDays30d}
              progressLabel="Ngày học (30 ngày gần đây)"
              kpis={[
                {
                  label: "Số quiz đã làm",
                  value: formatNumberVi(stats.completedQuizCount),
                },
                {
                  label: "Thời gian học",
                  value: formatStudyTimeVi(stats.studySeconds),
                },
                { label: "Điểm TB", value: `${stats.averageScorePercent}%` },
              ]}
              weeklyBars={stats.weeklyBars.map((bar) => ({
                day: bar.label,
                correct: bar.correct,
                wrong: bar.wrong,
              }))}
            />
          </div>

          <div className={layoutStyles.rightColumn}>
            <ProfileScoreCards xp={xp} showAiSuggestion={false} />
          </div>
        </section>
      </DashboardShell>
    );
  } catch (error) {
    if (isServiceError(error) && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
