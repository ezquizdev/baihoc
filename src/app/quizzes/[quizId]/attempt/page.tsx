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
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                href={`/quizzes/${quizId}/attempt`}
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
    case "CHALLENGE_TIME_LIMIT_MISSING":
      return "Thử thách chưa được cấu hình thời gian làm bài.";
    case "CHALLENGE_SCHEDULE_MISSING":
      return "Thử thách chưa được cấu hình lịch diễn ra.";
    case "CHALLENGE_SCHEDULE_INVALID":
      return "Lịch thử thách không hợp lệ.";
    default:
      return "Không thể bắt đầu quiz. Vui lòng thử lại.";
  }
}
