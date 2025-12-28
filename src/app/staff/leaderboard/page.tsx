import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function StaffLeaderboardPage() {
  await requireAuthenticatedPage({
    next: "/staff/leaderboard",
    role: "staff",
  });
  redirect("/leaderboard");
}
