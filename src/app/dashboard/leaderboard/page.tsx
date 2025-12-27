import { redirect } from "next/navigation";
import { controllerGetLeaderboardTable } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardLeaderboardScreen } from "@/components/dashboard/dashboard-leaderboard-screen";

export default async function DashboardLeaderboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/dashboard/leaderboard",
  });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }

  const pageSize = 20;
  const initial = await controllerGetLeaderboardTable({
    viewerUserId: session.sub,
    limit: pageSize,
    offset: 0,
    sortBy: "overall",
    sortDir: "desc",
    includeSelf: true,
  });

  return (
    <DashboardLeaderboardScreen
      session={session}
      initial={initial}
      pageSize={pageSize}
    />
  );
}
