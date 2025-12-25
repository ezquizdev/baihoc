import { controllerGetAttemptState } from "@/application/controllers/attemptController";
import { controllerGetPublishedQuiz } from "@/application/controllers/quizController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizAttemptScreen } from "@/components/quiz-attempt/quiz-attempt-screen";

type AttemptPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function AttemptPage({ params }: AttemptPageProps) {
  const { attemptId } = await params;
  const session = await requireAuthenticatedPage({
    next: `/attempts/${attemptId}`,
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  const state = await controllerGetAttemptState(session.sub, attemptId);

  let quizTitle = "Quiz";
  try {
    const quiz = await controllerGetPublishedQuiz(state.quizId);
    quizTitle = quiz.title ?? quizTitle;
  } catch {
    // Fallback title if quiz lookup fails.
  }

  return (
    <DashboardShell
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchDisabled
      searchPlaceholder="Tìm kiếm"
    >
      <QuizAttemptScreen
        attemptId={attemptId}
        quizTitle={quizTitle}
        initialState={state}
      />
    </DashboardShell>
  );
}
