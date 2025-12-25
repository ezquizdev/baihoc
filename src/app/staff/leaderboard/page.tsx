import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "../staff-stub-page.module.css";

export default async function StaffLeaderboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/leaderboard",
    role: "staff",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <StaffShell
      pageTitle="Bảng xếp hạng"
      activeNav="leaderboard"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <div className={styles.card}>Sắp ra mắt</div>
    </StaffShell>
  );
}
