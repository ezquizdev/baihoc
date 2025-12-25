import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "../staff-stub-page.module.css";

export default async function StaffQuizzesPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/quizzes",
    role: "staff",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <StaffShell
      pageTitle="Tất cả quiz"
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <div className={styles.card}>Sắp ra mắt</div>
    </StaffShell>
  );
}
