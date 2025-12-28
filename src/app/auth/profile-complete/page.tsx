import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getProfilePrefill } from "@/application/services/authService";
import { sanitizeNextPath } from "@/lib/urls";
import { ProfileCompleteForm } from "./ProfileCompleteForm";

function dashboardHrefForRole(role: string) {
  return role === "staff" ? "/staff/dashboard" : "/dashboard";
}

export default async function ProfileCompletePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuthenticatedPage({
    allowIncompleteProfile: true,
    next: "/auth/profile-complete",
  });
  const next = sanitizeNextPath((await searchParams)?.next);
  const fallback = dashboardHrefForRole(session.role);
  const redirectTo = next ?? fallback;
  if (session.profileCompleted) {
    redirect(redirectTo as Parameters<typeof redirect>[0]);
  }
  let initialProfile = {};
  let error: string | null = null;
  try {
    initialProfile = await getProfilePrefill(session.sub);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Không thể tải thông tin hồ sơ";
  }
  return (
    <ProfileCompleteForm
      initialProfile={initialProfile}
      errorMessage={error}
      redirectTo={redirectTo}
    />
  );
}
