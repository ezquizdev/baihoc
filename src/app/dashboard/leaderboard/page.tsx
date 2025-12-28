import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function DashboardLeaderboardPage() {
  await requireAuthenticatedPage({ next: "/dashboard/leaderboard" });
  redirect("/leaderboard");
}
