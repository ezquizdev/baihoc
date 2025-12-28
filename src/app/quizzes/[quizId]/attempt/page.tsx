import Link from "next/link";
import { redirect } from "next/navigation";
import { controllerStartAttempt } from "@/application/controllers/attemptController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

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
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  let attemptId: string;
  let attemptStatus: string;
  try {
    ({ attemptId, status: attemptStatus } = await controllerStartAttempt(
      session.sub,
      quizId,
    ));
  } catch (error) {
    const message = getAttemptStartMessage(error);
    const activeAttemptId = getActiveAttemptId(error);
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
          title="Không thể bắt đầu quiz"
          description={message}
          actions={
            <div className="flex flex-wrap gap-3">
              {activeAttemptId ? (
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:rgba(40,104,230,0.28)]"
                  href={`/attempts/${activeAttemptId}`}
                >
                  Tiếp tục lượt làm đang diễn ra
                </Link>
              ) : (
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:rgba(40,104,230,0.28)]"
                  href={`/quizzes/${quizId}/attempt`}
                >
                  Thử lại
                </Link>
              )}
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--line)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:rgba(40,104,230,0.28)]"
                href="/quizzes"
              >
                Về danh sách quiz
              </Link>
            </div>
          }
        >
          <div className="text-sm text-[var(--muted)]">
            Nếu bạn vừa đăng nhập, hãy thử lại hoặc quay lại danh sách quiz.
          </div>
        </Card>
      </DashboardShell>
    );
  }

  if (attemptStatus !== "in_progress") {
    redirect(`/attempts/${attemptId}/results`);
  }
  redirect(`/attempts/${attemptId}`);
}

function getAttemptStartMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? String((error as { code?: unknown }).code)
      : null;
  switch (code) {
    case "QUIZ_NOT_FOUND":
      return "Quiz không tồn tại hoặc chưa được phát hành.";
    case "QUIZ_NO_QUESTIONS":
      return "Quiz hiện chưa có câu hỏi để làm.";
    case "CHALLENGE_NOT_ACTIVE":
      return "Thử thách chưa bắt đầu hoặc đã kết thúc.";
    case "CHALLENGE_SCHEDULE_MISSING":
      return "Thử thách chưa được cấu hình lịch diễn ra.";
    case "CHALLENGE_SCHEDULE_INVALID":
      return "Lịch thử thách không hợp lệ.";
    case "ATTEMPT_OTHER_IN_PROGRESS":
      return "Bạn đang có một lượt làm quiz đang diễn ra. Vui lòng hoàn thành trước khi bắt đầu quiz khác.";
    default:
      return "Không thể bắt đầu quiz. Vui lòng thử lại.";
  }
}

function getActiveAttemptId(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("details" in error)) return null;
  const details = (error as { details?: unknown }).details;
  if (typeof details !== "object" || details === null) return null;
  const record = details as Record<string, unknown>;
  return typeof record.activeAttemptId === "string"
    ? record.activeAttemptId
    : null;
}
