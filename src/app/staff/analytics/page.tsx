import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { StaffAnalyticsScreen } from "@/components/staff-dashboard/staff-analytics-screen";

export default async function StaffAnalyticsPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/analytics",
    role: "staff",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <StaffShell
      pageTitle="Phân tích thống kê"
      activeNav="analytics"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <StaffAnalyticsScreen />
    </StaffShell>
  );
}
