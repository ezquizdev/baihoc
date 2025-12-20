import { notFound, redirect } from "next/navigation";
import { controllerAdminGetUser } from "@/application/controllers/userAdminController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OtherUserProfileCard } from "@/components/profile/OtherUserProfileCard";
import { staffNavItems } from "@/components/staff-dashboard/staff-nav";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { userId: string };

export default async function OtherProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { userId } = await params;
  if (!uuidRegex.test(userId)) {
    notFound();
  }

  const session = await requireAuthenticatedPage({
    next: `/profile/${userId}`,
  });
  if (userId === session.sub) {
    redirect("/profile");
  }
  if (session.role !== "staff") {
    notFound();
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  try {
    const user = await controllerAdminGetUser(userId);
    return (
      <DashboardShell
        pageTitle="Hồ sơ"
        activeNav="profile"
        navItems={staffNavItems}
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
      >
        <OtherUserProfileCard user={user} />
      </DashboardShell>
    );
  } catch (error) {
    if (isServiceError(error) && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
