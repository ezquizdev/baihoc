import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getProfilePrefill } from "@/application/services/authService";
import { ProfileCompleteForm } from "./ProfileCompleteForm";

function sanitizeNext(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function dashboardHrefForRole(role: string) {
  return role === "staff" ? "/staff/dashboard" : "/dashboard";
}

export default async function ProfileCompletePage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const session = await requireAuthenticatedPage({
    allowIncompleteProfile: true,
    next: "/auth/profile-complete",
  });
  const next = sanitizeNext(searchParams?.next);
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
