import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getProfilePrefill } from "@/application/services/authService";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SelfProfileCard } from "@/components/profile/SelfProfileCard";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";

export default async function ProfilePage() {
  const session = await requireAuthenticatedPage({
    next: "/profile",
  });
  const displayName = session.fullName ?? session.email.split("@")[0];
  const profile = await getProfilePrefill(session.sub);
  const navItems = session.role === "staff" ? staffNavItems : undefined;
  const activeNav = session.role === "staff" ? "profile" : "settings";

  return (
    <DashboardShell
      pageTitle="Hồ sơ"
      activeNav={activeNav}
      navItems={navItems}
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <SelfProfileCard
        userId={session.sub}
        email={session.email}
        role={session.role}
        profileCompleted={session.profileCompleted}
        initialFullName={profile.fullName}
        initialAvatarUrl={profile.avatarUrl || null}
        initialSchool={profile.school}
        initialDateOfBirth={profile.dateOfBirth}
      />
    </DashboardShell>
  );
}
