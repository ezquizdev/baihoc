import Link from "next/link";
import { redirect } from "next/navigation";
import { controllerGetAttemptReviewState } from "@/application/controllers/attemptController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { AttemptResultsScreen } from "@/components/attempt-review/attempt-results-screen";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

type AttemptResultsPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function AttemptResultsPage({
  params,
}: AttemptResultsPageProps) {
  const { attemptId } = await params;
  const session = await requireAuthenticatedPage({
    next: `/attempts/${attemptId}/results`,
  });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  let state: Awaited<
    ReturnType<typeof controllerGetAttemptReviewState>
  > | null = null;
  try {
    state = await controllerGetAttemptReviewState(session.sub, attemptId);
  } catch (error) {
    const message = getAttemptLoadMessage(error);
    return (
      <DashboardShell
        activeNav="quizzes"
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
        searchDisabled
        hideSearch
        searchPlaceholder="Tìm kiếm"
      >
        <Card
          title="Không thể tải kết quả"
          description={message}
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/attempts/${attemptId}/results`}
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
            Nếu bạn chưa nộp bài, hãy quay lại màn làm bài để tiếp tục.
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
        hideSearch
        searchPlaceholder="Tìm kiếm"
      >
        <Card
          title="Không thể tải kết quả"
          description="Không thể tải kết quả. Vui lòng thử lại."
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/attempts/${attemptId}/results`}
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

  if (state.attempt.status === "in_progress") {
    return (
      <DashboardShell
        activeNav="quizzes"
        userEmail={session.email}
        userName={displayName}
        avatarUrl={session.avatarUrl}
        searchDisabled
        hideSearch
        searchPlaceholder="Tìm kiếm"
      >
        <Card
          title="Chưa có kết quả"
          description="Bạn chưa nộp bài. Hãy quay lại màn làm bài để tiếp tục."
          actions={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/attempts/${attemptId}`}
              >
                Tiếp tục làm bài
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

  return (
    <DashboardShell
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchDisabled
      hideSearch
      searchPlaceholder="Tìm kiếm"
    >
      <AttemptResultsScreen attemptId={attemptId} state={state} />
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
      return "Không thể tải kết quả. Vui lòng thử lại.";
  }
}
