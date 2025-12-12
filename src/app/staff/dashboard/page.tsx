import { controllerGetStaffDashboardOverview } from "@/application/controllers/staffDashboardController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import type { StaffDashboardOverviewDto } from "@/application/models/staffDashboard";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { StaffDashboardScreen } from "@/components/staff-dashboard/staff-dashboard-screen";

function fallbackOverview(): StaffDashboardOverviewDto {
  const error = { status: "error", message: "unknown_error" } as const;
  return {
    stats: error,
    activity: error,
    leaderboard: error,
    competency: error,
  };
}

export default async function StaffDashboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/dashboard",
    role: "staff",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  const subjects = await controllerListSubjects().catch(() => []);
  const overview = await controllerGetStaffDashboardOverview({
    leaderboardLimit: 5,
    activityLimit: 6,
    subjects,
  }).catch(() => fallbackOverview());

  return (
    <StaffShell
      pageTitle="Tổng quan"
      activeNav="overview"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <StaffDashboardScreen displayName={displayName} overview={overview} />
    </StaffShell>
  );
}
