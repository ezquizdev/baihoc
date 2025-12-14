import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import styles from "../dashboard-stub-page.module.css";

export default async function DashboardHistoryPage() {
  const session = await requireAuthenticatedPage({
    next: "/dashboard/history",
  });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <DashboardShell
      pageTitle="Lịch sử"
      activeNav="history"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <div className={styles.card}>Sắp ra mắt</div>
    </DashboardShell>
  );
}
