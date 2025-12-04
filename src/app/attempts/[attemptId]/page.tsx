import Link from "next/link";
import { controllerGetAttemptState } from "@/application/controllers/attemptController";
import { controllerGetPublishedQuiz } from "@/application/controllers/quizController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizAttemptScreen } from "@/components/quiz-attempt/quiz-attempt-screen";
import { Card } from "@/components/ui/card";

type AttemptPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function AttemptPage({ params }: AttemptPageProps) {
  const { attemptId } = await params;
  const session = await requireAuthenticatedPage({
    next: `/attempts/${attemptId}`,
  });
  const displayName = session.fullName ?? session.email.split("@")[0];

  let state: Awaited<ReturnType<typeof controllerGetAttemptState>> | null =
    null;
  try {
    state = await controllerGetAttemptState(session.sub, attemptId);
  } catch (error) {
    const message = getAttemptLoadMessage(error);
    return (
      <DashboardShell
        activeNav="quizzes"
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
        searchDisabled
        searchPlaceholder="Tìm kiếm"
      >
        <Card
          title="Không thể tải bài làm"
          description={message}
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/attempts/${attemptId}`}
              >
                Thử lại
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                href="/quizzes"
              >
                Về danh sách quiz
              </Link>
            </div>
          }
        >
          <div className="text-sm text-slate-600">
            Nếu bạn vừa đăng nhập, hãy thử lại hoặc quay lại danh sách quiz.
          </div>
        </Card>
      </DashboardShell>
    );
  }
  if (!state) {
    return (
      <DashboardShell
        activeNav="quizzes"
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
        searchDisabled
        searchPlaceholder="Tìm kiếm"
      >
        <Card
          title="Không thể tải bài làm"
          description="Không thể tải bài làm. Vui lòng thử lại."
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/attempts/${attemptId}`}
              >
                Thử lại
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                href="/quizzes"
              >
                Về danh sách quiz
              </Link>
            </div>
          }
        />
      </DashboardShell>
    );
  }

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

function getAttemptLoadMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? String((error as { code?: unknown }).code)
      : null;
  switch (code) {
    case "ATTEMPT_NOT_FOUND":
      return "Bài làm không tồn tại hoặc đã bị xoá.";
    case "ATTEMPT_FORBIDDEN":
      return "Bạn không có quyền xem bài làm này.";
    default:
      return "Không thể tải bài làm. Vui lòng thử lại.";
  }
}
