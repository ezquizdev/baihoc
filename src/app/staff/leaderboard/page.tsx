import { controllerGetLeaderboardTable } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardLeaderboardScreen } from "@/components/dashboard/dashboard-leaderboard-screen";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";

export default async function StaffLeaderboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/leaderboard",
    role: "staff",
  });
  const pageSize = 20;
  const initial = await controllerGetLeaderboardTable({
    viewerUserId: session.sub,
    limit: pageSize,
    offset: 0,
    sortBy: "overall",
    sortDir: "desc",
    includeSelf: false,
  });

  return (
    <DashboardLeaderboardScreen
      session={session}
      initial={initial}
      pageSize={pageSize}
      navItems={staffNavItems}
    />
  );
}
