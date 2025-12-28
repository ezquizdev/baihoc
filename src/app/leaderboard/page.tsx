import { controllerGetLeaderboardTable } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardLeaderboardScreen } from "@/components/dashboard/dashboard-leaderboard-screen";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";

export default async function LeaderboardPage() {
  const session = await requireAuthenticatedPage({ next: "/leaderboard" });

  const pageSize = 20;
  const isStaff = session.role === "staff";
  const initial = await controllerGetLeaderboardTable({
    viewerUserId: session.sub,
    limit: pageSize,
    offset: 0,
    sortBy: "overall",
    sortDir: "desc",
    includeSelf: !isStaff,
  });

  return (
    <DashboardLeaderboardScreen
      session={session}
      initial={initial}
      pageSize={pageSize}
      navItems={isStaff ? staffNavItems : undefined}
    />
  );
}
