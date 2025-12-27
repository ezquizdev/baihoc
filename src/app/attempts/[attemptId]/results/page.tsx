import Link from "next/link";
import { controllerGetAttemptReviewState } from "@/application/controllers/attemptController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import type {
  AttemptAnswer,
  AttemptReviewQuestion,
} from "@/application/models/attempt";
import { RejudgeAttemptButton } from "@/components/attempt-review/rejudge-attempt-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RichText } from "@/components/ui/rich-text";

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

  const quizTitle = state.quizTitle ?? "Quiz";

  const answerMap = new Map<string, AttemptAnswer>();
  for (const answer of state.answers) {
    answerMap.set(answer.questionId, answer);
  }

  const answeredCount = state.questions.reduce((count, question) => {
    const answer = answerMap.get(question.id);
    if (!answer) return count;
    if (question.type === "short_answer") {
      return answer.textAnswer ? count + 1 : count;
    }
    return answer.selectedOptionIds?.length ? count + 1 : count;
  }, 0);

  const passageLabels = buildPassageLabels(state.questions);
  const showQuizDeletedBanner = !state.quizExists;
  const showLegacyBanner = state.reviewMode === "legacy";
  const showRejudgeBanner = state.quizExists && state.quizContentChanged;
  const showRejudgeUnavailableBanner =
    state.quizExists &&
    Boolean(state.quizContentHashSnapshot) &&
    !state.quizContentHashCurrent &&
    state.reviewMode === "snapshot";

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
        title={`Kết quả: ${quizTitle}`}
        description={`Trạng thái: ${state.attempt.status} • Đã trả lời ${answeredCount}/${state.questions.length} câu • Phiên bản chấm: v${state.judgementVersion}`}
      >
        {showQuizDeletedBanner ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            Quiz có thể đã bị xoá. Không thể chấm lại, nhưng bạn vẫn có thể xem
            lại kết quả dựa trên dữ liệu đã lưu.
          </div>
        ) : null}

        {showLegacyBanner ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            Bài làm này chưa có snapshot đầy đủ. Nội dung hiển thị có thể dựa
            trên quiz hiện tại và không phản ánh chính xác lịch sử khi bạn làm
            bài.
          </div>
        ) : null}

        {showRejudgeBanner ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 md:flex-row md:items-center md:justify-between">
            <div>
              Quiz đã thay đổi kể từ lúc bạn nộp. Bạn có thể chấm lại để cập
              nhật điểm theo phiên bản mới nhất.
            </div>
            <RejudgeAttemptButton attemptId={attemptId} />
          </div>
        ) : null}

        {showRejudgeUnavailableBanner ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Quiz đã thay đổi quá nhiều và không còn câu hỏi nào trùng với lượt
            làm này, nên không thể chấm lại.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Điểm" value={`${state.attempt.scorePercent}%`} />
          <Stat
            label="Đúng"
            value={`${state.attempt.correctCount}/${state.attempt.totalQuestions}`}
          />
          <Stat label="XP" value={`${state.attempt.xpEarned}`} />
        </div>

        <div className="space-y-4">
          {state.questions.map((question) => (
            <QuestionResultRow
              key={question.id}
              question={question}
              answer={answerMap.get(question.id)}
              passageLabel={
                question.passage
                  ? passageLabels.get(question.passage.id)
                  : undefined
              }
            />
          ))}
        </div>
      </Card>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function QuestionResultRow({
  question,
  answer,
  passageLabel,
}: {
  question: AttemptReviewQuestion;
  answer?: AttemptAnswer;
  passageLabel?: string;
}) {
  const isCorrect = answer?.isCorrect;
  const badge =
    isCorrect === undefined ? (
      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
        Chưa chấm
      </span>
    ) : isCorrect ? (
      <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        Đúng
      </span>
    ) : (
      <span className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
        Sai
      </span>
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-extrabold text-slate-900">
          Câu {question.position}
        </div>
        {badge}
      </div>

      {!question.exists ? (
        <div className="mt-3 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          Câu hỏi này đã bị xoá nên không thể hiển thị nội dung đầy đủ.
        </div>
      ) : null}

      {question.passage ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <div className="mb-2 text-sm font-extrabold text-slate-700">
            {passageLabel ?? "Dùng thông tin sau để trả lời các câu liên quan."}
          </div>
          <RichText content={question.passage.content} allowLinks />
        </div>
      ) : null}

      {question.stem ? (
        <RichText
          content={question.stem}
          className="mt-3 text-sm text-slate-800"
          allowLinks
        />
      ) : (
        <div className="mt-3 text-sm font-semibold text-slate-500">—</div>
      )}

      <div className="mt-4 text-sm">
        <div className="text-xs font-semibold text-slate-500">
          Câu trả lời của bạn
        </div>
        <div className="mt-1 text-slate-800">
          {renderUserAnswer(question, answer)}
        </div>
      </div>
    </section>
  );
}

function renderUserAnswer(
  question: AttemptReviewQuestion,
  answer?: AttemptAnswer,
) {
  if (!answer) return <span className="text-slate-500">—</span>;
  if (question.type === "short_answer") {
    return answer.textAnswer ? (
      <RichText
        content={answer.textAnswer}
        variant="inline"
        allowLinks={false}
      />
    ) : (
      <span className="text-slate-500">—</span>
    );
  }

  if (!question.exists) {
    return answer.selectedOptionIds?.length ? (
      <span className="text-slate-500">
        {answer.selectedOptionIds.length} lựa chọn (không thể hiển thị)
      </span>
    ) : (
      <span className="text-slate-500">—</span>
    );
  }

  const selected = new Set(answer.selectedOptionIds ?? []);
  const selectedOptions = question.options.filter((opt) =>
    selected.has(opt.id),
  );
  if (!selectedOptions.length) {
    return answer.selectedOptionIds?.length ? (
      <span className="text-slate-500">
        Lựa chọn bạn chọn không còn tồn tại.
      </span>
    ) : (
      <span className="text-slate-500">—</span>
    );
  }

  return (
    <ul className="list-disc space-y-1 pl-5">
      {selectedOptions.map((opt) => (
        <li key={opt.id}>
          {opt.label ? `${opt.label}. ` : ""}
          <RichText content={opt.text} variant="inline" allowLinks={false} />
        </li>
      ))}
    </ul>
  );
}

function buildPassageLabels(questions: AttemptReviewQuestion[]) {
  const ranges = new Map<string, { start: number; end: number }>();
  for (const question of questions) {
    const passage = question.passage;
    if (!passage) continue;
    const existing = ranges.get(passage.id);
    if (!existing) {
      ranges.set(passage.id, {
        start: question.position,
        end: question.position,
      });
      continue;
    }
    existing.start = Math.min(existing.start, question.position);
    existing.end = Math.max(existing.end, question.position);
  }

  const labels = new Map<string, string>();
  for (const [passageId, range] of ranges) {
    labels.set(passageId, buildPassageLabel(range));
  }
  return labels;
}

function buildPassageLabel(range: { start: number; end: number }) {
  if (range.start === range.end) {
    return `Dùng thông tin sau để trả lời câu ${range.start}.`;
  }
  return `Dùng thông tin sau để trả lời các câu ${range.start}–${range.end}.`;
}
