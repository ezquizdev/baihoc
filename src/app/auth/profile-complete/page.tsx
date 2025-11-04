import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getProfilePrefill } from "@/application/services/authService";
import { ProfileCompleteForm } from "./ProfileCompleteForm";

export default async function ProfileCompletePage() {
  const session = await requireAuthenticatedPage({
    allowIncompleteProfile: true,
    next: "/auth/profile-complete",
  });
  if (session.profileCompleted) {
    redirect("/dashboard");
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
      userId={session.sub}
      initialProfile={initialProfile}
      errorMessage={error}
    />
  );
}
