import Link from "next/link";
import { controllerGetAttemptState } from "@/application/controllers/attemptController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import type {
  AttemptAnswer,
  AttemptQuestion,
} from "@/application/models/attempt";
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
        description={`Trạng thái: ${state.attempt.status} • Đã trả lời ${answeredCount}/${state.questions.length} câu`}
      >
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
  question: AttemptQuestion;
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

      {question.passage ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <div className="mb-2 text-sm font-extrabold text-slate-700">
            {passageLabel ?? "Dùng thông tin sau để trả lời các câu liên quan."}
          </div>
          <RichText content={question.passage.content} allowLinks />
        </div>
      ) : null}

      <RichText
        content={question.stem}
        className="mt-3 text-sm text-slate-800"
        allowLinks
      />

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

function renderUserAnswer(question: AttemptQuestion, answer?: AttemptAnswer) {
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

  const selected = new Set(answer.selectedOptionIds ?? []);
  const selectedOptions = question.options.filter((opt) =>
    selected.has(opt.id),
  );
  if (!selectedOptions.length) return <span className="text-slate-500">—</span>;

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

function buildPassageLabels(questions: AttemptQuestion[]) {
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
