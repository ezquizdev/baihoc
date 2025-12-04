import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AttemptStartScreen } from "@/components/quiz-attempt/attempt-start-screen";

type QuizAttemptStartPageProps = {
  params: Promise<{ quizId: string }>;
};

export default async function QuizAttemptStartPage({
  params,
}: QuizAttemptStartPageProps) {
  const { quizId } = await params;
  const session = await requireAuthenticatedPage({
    next: `/quizzes/${quizId}/attempt`,
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <DashboardShell
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchDisabled
      searchPlaceholder="Tìm kiếm"
    >
      <AttemptStartScreen quizId={quizId} />
    </DashboardShell>
  );
}

