import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getProfilePrefill } from "@/application/services/authService";
import { getSelfProfileOverview } from "@/application/services/profileService";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProfileScoreCards } from "@/components/profile/ProfileScoreCards";
import { SelfProfileCard } from "@/components/profile/SelfProfileCard";
import { StaffProfileCard } from "@/components/profile/StaffProfileCard";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";
import { formatNumberVi, formatStudyTimeVi } from "@/lib/formatters";
import layoutStyles from "./profile-page.module.css";

export default async function ProfilePage() {
  const session = await requireAuthenticatedPage({
    next: "/profile",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];
  const profile = await getProfilePrefill(session.sub);
  const navItems = session.role === "staff" ? staffNavItems : undefined;
  const activeNav = session.role === "staff" ? "profile" : "settings";

  if (session.role === "staff") {
    return (
      <DashboardShell
        pageTitle="Hồ sơ"
        activeNav={activeNav}
        navItems={navItems}
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
      >
        <section className={layoutStyles.singleColumn} aria-label="Hồ sơ">
          <StaffProfileCard
            email={session.email}
            initialFullName={profile.fullName}
            initialAvatarUrl={profile.avatarUrl || null}
            hasPassword={profile.hasPassword}
          />
        </section>
      </DashboardShell>
    );
  }

  let overviewError: string | null = null;
  const overview = await getSelfProfileOverview(session.sub).catch((error) => {
    overviewError = error instanceof Error ? error.message : "unknown_error";
    return null;
  });

  const stats = overview?.stats ?? {
    completedQuizCount: 0,
    activeDays30d: 0,
    studySeconds: 0,
    averageScorePercent: 0,
    weeklyBars: [
      { label: "T2", correct: 0, wrong: 0 },
      { label: "T3", correct: 0, wrong: 0 },
      { label: "T4", correct: 0, wrong: 0 },
      { label: "T5", correct: 0, wrong: 0 },
      { label: "T6", correct: 0, wrong: 0 },
      { label: "T7", correct: 0, wrong: 0 },
      { label: "CN", correct: 0, wrong: 0 },
    ],
  };

  const xp = overview?.xp ?? {
    totalXp: 0,
    xpVi: 0,
    xpEn: 0,
    xpMath: 0,
    xpSci: 0,
  };

  return (
    <DashboardShell
      pageTitle="Hồ sơ"
      activeNav={activeNav}
      navItems={navItems}
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <section className={layoutStyles.pageGrid} aria-label="Hồ sơ cá nhân">
        <div className={layoutStyles.leftColumn}>
          <SelfProfileCard
            email={session.email}
            role={session.role}
            profileCompleted={session.profileCompleted}
            initialFullName={profile.fullName}
            initialAvatarUrl={profile.avatarUrl || null}
            initialSchool={profile.school}
            initialDateOfBirth={profile.dateOfBirth}
            hasPassword={profile.hasPassword}
          />

          <div>
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
            {overviewError ? (
              <p className={layoutStyles.inlineError}>
                Không thể tải thống kê hồ sơ ({overviewError}).
              </p>
            ) : null}
          </div>
        </div>

        <div className={layoutStyles.rightColumn}>
          <ProfileScoreCards xp={xp} />
        </div>
      </section>
    </DashboardShell>
  );
}
