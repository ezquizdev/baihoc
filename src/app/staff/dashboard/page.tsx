import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { StaffDashboardScreen } from "@/components/staff-dashboard/staff-dashboard-screen";

export default async function StaffDashboardPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/dashboard",
    role: "staff",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <StaffShell
      pageTitle="Tổng quan"
      activeNav="overview"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <StaffDashboardScreen displayName={displayName} />
    </StaffShell>
  );
}
