import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import styles from "../dashboard-stub-page.module.css";

export default async function DashboardLeaderboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/dashboard/leaderboard",
  });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <DashboardShell
      pageTitle="Bảng xếp hạng"
      activeNav="leaderboard"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <div className={styles.card}>Sắp ra mắt</div>
    </DashboardShell>
  );
}

