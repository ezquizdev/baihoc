import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type {
  AttemptAnswer,
  AttemptReviewQuestion,
  AttemptReviewStateResponse,
} from "@/application/models/attempt";
import { RejudgeAttemptButton } from "@/components/attempt-review/rejudge-attempt-button";
import { SubjectBadge } from "@/components/quiz-catalog/quiz-badges";
import { RichText } from "@/components/ui/rich-text";
import {
  formatDateVi,
  formatNumberVi,
  formatRelativeTimeVi,
} from "@/lib/formatters";
import styles from "./attempt-results.module.css";

export function AttemptResultsScreen({
  attemptId,
  state,
}: {
  attemptId: string;
  state: AttemptReviewStateResponse;
}) {
  const quizTitle = state.quizTitle ?? "Quiz";

  const answerMap = new Map<string, AttemptAnswer>();
  for (const answer of state.answers) {
    answerMap.set(answer.questionId, answer);
  }

  const detailUnavailable =
    state.questions.length > 0 &&
    state.answers.length === 0 &&
    (state.attempt.correctCount > 0 || state.attempt.scorePercent > 0);

  const baseSummaries = state.questions.map((question) => {
    const answer = answerMap.get(question.id);
    const status = getQuestionStatus(question, answer, { detailUnavailable });
    return {
      question,
      answer,
      status,
      anchor: `q-${question.position}`,
    };
  });

  const questionSummaries = baseSummaries.map((summary) => ({
    ...summary,
    defaultOpen: summary.status !== "correct",
  }));

  const correctCount = questionSummaries.filter(
    (q) => q.status === "correct",
  ).length;
  const wrongCount = questionSummaries.filter(
    (q) => q.status === "wrong",
  ).length;
  const ungradedCount = questionSummaries.filter(
    (q) => q.status === "ungraded",
  ).length;
  const unansweredCount = questionSummaries.filter(
    (q) => q.status === "unanswered",
  ).length;
  const needsReviewCount = Math.max(
    0,
    state.attempt.totalQuestions - state.attempt.correctCount,
  );

  const scorePercent = clampPercent(state.attempt.scorePercent);
  const completedAt = state.attempt.submittedAt ?? state.attempt.startedAt;
  const completedRelative = formatRelativeTimeVi(completedAt);
  const completedDate = formatDateVi(completedAt);
  const durationLabel = formatDurationFromIso(
    state.attempt.startedAt,
    state.attempt.submittedAt,
  );

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
    <div className={styles.page}>
      <section className={styles.heroCard} aria-label="Tóm tắt kết quả">
        <div className={styles.heroTop}>
          <div className={styles.heroTitleBlock}>
            <div className={styles.heroKicker}>Kết quả</div>
            <h1 className={styles.heroTitle}>{quizTitle}</h1>
            <div className={styles.heroSubtitle}>
              Hoàn thành {completedRelative} • {completedDate}
              {durationLabel ? ` • ${durationLabel}` : ""}
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/dashboard/history">
              Lịch sử
            </Link>
            <Link className={styles.primaryAction} href="/quizzes">
              Quiz khác
            </Link>
          </div>
        </div>

        <div className={styles.heroMain}>
          <div
            className={styles.scoreRing}
            style={{ "--p": scorePercent } as CSSProperties}
            aria-label={`Điểm ${scorePercent}%`}
            role="img"
          >
            <div className={styles.scoreInner}>
              <div className={styles.scoreValue}>{scorePercent}%</div>
              {/*<div className={styles.scoreLabel}>Điểm</div>*/}
            </div>
          </div>

          <div className={styles.heroStats}>
            <section className={styles.statsGrid} aria-label="Thống kê">
              <MetaStat
                label="Đúng"
                value={`${state.attempt.correctCount}/${state.attempt.totalQuestions}`}
                tone="success"
              />
              <MetaStat
                label="Điểm năng lực"
                value={formatNumberVi(state.attempt.xpEarned)}
                tone="primary"
              />
              <MetaStat
                label="Tổng câu"
                value={formatNumberVi(state.attempt.totalQuestions)}
                tone="muted"
              />
              {needsReviewCount > 0 ? (
                <MetaStat
                  label="Cần xem lại"
                  value={
                    detailUnavailable
                      ? `${formatNumberVi(needsReviewCount)} câu`
                      : [
                          wrongCount ? `${wrongCount} sai` : null,
                          unansweredCount
                            ? `${unansweredCount} bỏ trống`
                            : null,
                          ungradedCount ? `${ungradedCount} chưa chấm` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                  }
                  tone="warning"
                />
              ) : (
                <MetaStat
                  label="Trạng thái"
                  value="Rất tốt — tất cả đúng"
                  tone="success"
                />
              )}
            </section>

            {/*<div className={styles.metaFootnote}>
              Phiên bản chấm: v{state.judgementVersion}
            </div>*/}
          </div>
        </div>
      </section>

      {showQuizDeletedBanner ||
      showLegacyBanner ||
      showRejudgeBanner ||
      showRejudgeUnavailableBanner ? (
        <section className={styles.noticeStack} aria-label="Thông báo">
          {showQuizDeletedBanner ? (
            <div className={`${styles.notice} ${styles.noticeDanger}`}>
              Quiz có thể đã bị xoá. Không thể chấm lại, nhưng bạn vẫn có thể
              xem lại kết quả dựa trên dữ liệu đã lưu.
            </div>
          ) : null}

          {showLegacyBanner ? (
            <div className={`${styles.notice} ${styles.noticeMuted}`}>
              {detailUnavailable
                ? "Bài làm này chưa có snapshot đầy đủ, nên một số thông tin và đáp án chi tiết có thể không hiển thị chính xác."
                : "Bài làm này chưa có snapshot đầy đủ, nên một số thông tin có thể không phản ánh đúng thời điểm bạn làm bài."}
            </div>
          ) : null}

          {showRejudgeBanner ? (
            <div className={`${styles.notice} ${styles.noticeWarn}`}>
              <div className={styles.noticeRow}>
                <div>
                  Quiz đã thay đổi kể từ lúc bạn nộp. Bạn có thể chấm lại để cập
                  nhật điểm theo phiên bản mới nhất.
                </div>
                <div>
                  <RejudgeAttemptButton attemptId={attemptId} />
                </div>
              </div>
            </div>
          ) : null}

          {showRejudgeUnavailableBanner ? (
            <div className={`${styles.notice} ${styles.noticeWarn}`}>
              Quiz đã thay đổi quá nhiều và không còn câu hỏi nào trùng với lượt
              làm này, nên không thể chấm lại.
            </div>
          ) : null}
        </section>
      ) : null}

      {state.subjectScores.length ? (
        <details className={styles.sectionCard} open aria-label="Điểm theo môn">
          <summary className={styles.sectionSummary}>
            <div className={styles.sectionSummaryTitle}>Theo môn</div>
            <div className={styles.sectionSummaryHint}>
              {state.subjectScores.length} môn
              {state.subjectScoresEstimated ? " • ước tính" : ""}
            </div>
            <span className={styles.sectionChevron} aria-hidden="true">
              ▾
            </span>
          </summary>

          <div className={styles.sectionBody}>
            <section className={styles.subjectList} aria-label="Điểm theo môn">
              {state.subjectScores.map((subject) => {
                const percent = clampPercent(subject.scorePercent);
                return (
                  <div key={subject.subjectId} className={styles.subjectRow}>
                    <div className={styles.subjectRowTop}>
                      <SubjectBadge name={subject.name} slug={subject.slug} />
                      <div className={styles.subjectRowRight}>
                        <span className={styles.subjectPercent}>
                          {Math.round(percent)}%
                        </span>
                        <span className={styles.subjectIrt}>
                          {formatNumberVi(subject.irtScore)} ĐNL
                        </span>
                      </div>
                    </div>
                    <div className={styles.subjectRowBottom}>
                      <span className={styles.subjectDetail}>
                        {subject.correctCount}/{subject.totalQuestions} đúng
                      </span>
                    </div>
                    <div className={styles.subjectBar} aria-hidden="true">
                      <div
                        className={styles.subjectBarFill}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
            {state.subjectScoresEstimated ? (
              <div className={styles.subjectNote}>
                * Điểm theo môn đang được ước tính.
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <section className={styles.reviewLayout} aria-label="Xem lại từng câu">
        <div className={styles.reviewMain}>
          <header className={styles.reviewHeader}>
            <h2 className={styles.reviewTitle}>Xem lại</h2>
            <div className={styles.reviewSubtitle}>
              {detailUnavailable
                ? `${state.attempt.correctCount} đúng • ${needsReviewCount} chưa đúng`
                : `${correctCount} đúng • ${wrongCount} sai • ${unansweredCount} bỏ trống${
                    ungradedCount ? ` • ${ungradedCount} chưa chấm` : ""
                  }`}
            </div>
          </header>

          <div className={styles.questionList}>
            {questionSummaries.map(
              ({ question, answer, status, defaultOpen }) => (
                <QuestionReviewCard
                  key={question.id}
                  question={question}
                  answer={answer}
                  status={status}
                  defaultOpen={defaultOpen}
                  passageLabel={
                    question.passage
                      ? passageLabels.get(question.passage.id)
                      : undefined
                  }
                />
              ),
            )}
          </div>
        </div>

        <aside className={styles.navigator} aria-label="Đi tới câu">
          <div className={styles.navTitle}>Đi tới câu</div>
          <div className={styles.navGrid}>
            {questionSummaries.map(({ question, status, anchor }) => (
              <a
                key={question.id}
                className={`${styles.navItem} ${navToneClass(status)}`.trim()}
                href={`#${anchor}`}
                aria-label={`Đi tới câu ${question.position}`}
              >
                {question.position}
              </a>
            ))}
          </div>
          <div className={styles.navLegend} aria-hidden="true">
            <span className={`${styles.legendDot} ${styles.legendCorrect}`} />{" "}
            Đúng{" "}
            <span className={`${styles.legendDot} ${styles.legendWrong}`} /> Sai{" "}
            <span
              className={`${styles.legendDot} ${styles.legendUnanswered}`}
            />{" "}
            Bỏ trống{" "}
            <span className={`${styles.legendDot} ${styles.legendUngraded}`} />{" "}
            Chưa chấm
          </div>
        </aside>
      </section>
    </div>
  );
}

function MetaStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "muted";
}) {
  return (
    <div className={`${styles.metaStat} ${metaToneClass(tone)}`.trim()}>
      <div className={styles.metaStatLabel}>{label}</div>
      <div className={styles.metaStatValue}>{value}</div>
    </div>
  );
}

function QuestionReviewCard({
  question,
  answer,
  passageLabel,
  status,
  defaultOpen,
}: {
  question: AttemptReviewQuestion;
  answer?: AttemptAnswer;
  passageLabel?: string;
  status: QuestionStatus;
  defaultOpen: boolean;
}) {
  const badge = buildBadge(status);
  const awardedIrtScore = answer?.awardedIrtScore;
  const answered =
    question.type === "short_answer"
      ? Boolean(answer?.textAnswer) || typeof answer?.isCorrect === "boolean"
      : Boolean(answer?.selectedOptionIds?.length) ||
        typeof answer?.isCorrect === "boolean";

  return (
    <details
      id={`q-${question.position}`}
      className={`${styles.questionCard} ${questionToneClass(status)}`.trim()}
      open={defaultOpen}
    >
      <summary className={styles.questionSummary}>
        <div className={styles.questionSummaryLeft}>
          <div className={styles.questionTitle}>Câu {question.position}</div>
          <div className={styles.questionHintRow}>
            <span className={styles.questionHint}>
              {status === "unanswered"
                ? "Bỏ trống"
                : status === "ungraded"
                  ? "Chưa chấm"
                  : "Đã trả lời"}
            </span>
            {!question.exists ? (
              <span className={styles.questionHintDanger}>Câu đã bị xoá</span>
            ) : null}
          </div>
        </div>

        <div className={styles.questionSummaryRight}>
          <span className={styles.questionIrt}>
            <span className={styles.questionIrtLabel}>ĐNL</span>{" "}
            {awardedIrtScore === undefined
              ? "—"
              : formatNumberVi(awardedIrtScore)}
          </span>
          {badge}
          <span className={styles.questionChevron} aria-hidden="true">
            ▾
          </span>
        </div>
      </summary>

      <div className={styles.questionBody}>
        {!question.exists ? (
          <div className={styles.missingQuestion}>
            Câu hỏi này đã bị xoá nên không thể hiển thị nội dung đầy đủ.
          </div>
        ) : null}

        {question.passage ? (
          <section className={styles.passage} aria-label="Đoạn văn">
            <div className={styles.passageTitle}>
              {passageLabel ??
                "Dùng thông tin sau để trả lời các câu liên quan."}
            </div>
            <RichText content={question.passage.content} allowLinks />
          </section>
        ) : null}

        {question.stem ? (
          <RichText
            content={question.stem}
            className={styles.stem}
            allowLinks
          />
        ) : (
          <div className={styles.stem}>—</div>
        )}

        {question.type === "short_answer" ? (
          <ShortAnswerReview question={question} answer={answer} />
        ) : (
          <McqReview question={question} answer={answer} answered={answered} />
        )}

        {question.exists && question.explanation ? (
          <details className={styles.explanation}>
            <summary className={styles.explanationHeader}>
              <span className={styles.explanationTitle}>Giải thích</span>
              <span className={styles.explanationToggle} aria-hidden="true">
                <span className={styles.explanationToggleLabelOpen}>Ẩn</span>
                <span className={styles.explanationToggleLabelClosed}>
                  Hiện
                </span>
              </span>
            </summary>
            <div className={styles.explanationBody}>
              <RichText content={question.explanation} allowLinks />
            </div>
          </details>
        ) : null}
      </div>
    </details>
  );
}

function McqReview({
  question,
  answer,
  answered,
}: {
  question: AttemptReviewQuestion;
  answer?: AttemptAnswer;
  answered: boolean;
}) {
  if (!question.exists) {
    return (
      <section className={styles.answerBox} aria-label="Câu trả lời">
        <div className={styles.answerTitle}>Câu trả lời của bạn</div>
        <div className={styles.answerBody}>
          {answer?.selectedOptionIds?.length
            ? `${answer.selectedOptionIds.length} lựa chọn (không thể hiển thị)`
            : "—"}
        </div>
      </section>
    );
  }

  if (!question.options.length) {
    return (
      <section className={styles.answerBox} aria-label="Câu trả lời">
        <div className={styles.answerTitle}>Câu trả lời của bạn</div>
        <div className={styles.answerBody}>
          Câu hỏi này chưa có lựa chọn. Vui lòng báo cho giáo viên/ban quản trị
          để cập nhật nội dung.
        </div>
      </section>
    );
  }

  const correctOptionIds = new Set(question.correctOptionIds);
  const hasCorrectKey = question.correctOptionIds.length > 0;
  const selectedOptionIds = new Set(answer?.selectedOptionIds ?? []);

  const selectedOptions = question.options.filter((opt) =>
    selectedOptionIds.has(opt.id),
  );
  const correctOptions = question.options.filter((opt) =>
    correctOptionIds.has(opt.id),
  );

  const selectedLabelText = selectedOptions.length
    ? selectedOptions.map(formatOptionLabel).join(", ")
    : "—";

  const correctLabelText = correctOptions.length
    ? correctOptions.map(formatOptionLabel).join(", ")
    : question.correctOptionIds.length
      ? `${question.correctOptionIds.length} lựa chọn (không thể hiển thị)`
      : "—";

  return (
    <section aria-label="Đáp án trắc nghiệm">
      <div className={styles.optionsGrid}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionIds.has(opt.id);
          const isCorrect = hasCorrectKey && correctOptionIds.has(opt.id);
          const isWrongSelected = hasCorrectKey && isSelected && !isCorrect;
          const isSelectedUnkeyed = !hasCorrectKey && isSelected;

          const optionClassName = [
            styles.optionItem,
            isCorrect && isSelected ? styles.optionCorrectSelected : "",
            isCorrect && !isSelected ? styles.optionCorrect : "",
            isWrongSelected ? styles.optionWrongSelected : "",
            isSelectedUnkeyed ? styles.optionSelected : "",
          ]
            .filter(Boolean)
            .join(" ");

          const icon = isCorrect ? (
            <span className={styles.optionIconSuccess} aria-hidden="true">
              <CheckCircleIcon size={18} color="currentColor" />
            </span>
          ) : isWrongSelected ? (
            <span className={styles.optionIconDanger} aria-hidden="true">
              <XCircleIcon size={18} color="currentColor" />
            </span>
          ) : isSelectedUnkeyed ? (
            <span className={styles.optionIconWarn} aria-hidden="true">
              <WarningCircleIcon size={18} color="currentColor" />
            </span>
          ) : (
            <span className={styles.optionIconMuted} aria-hidden="true">
              <CircleIcon size={18} color="currentColor" />
            </span>
          );

          return (
            <div key={opt.id} className={optionClassName}>
              <div className={styles.optionIcon}>{icon}</div>
              <div className={styles.optionBody}>
                <span className={styles.optionLabel}>
                  {formatOptionLabel(opt)}.
                </span>{" "}
                <RichText
                  content={opt.text}
                  variant="inline"
                  allowLinks={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summaryRow}>
        <span>
          <span className={styles.summaryKey}>Bạn chọn:</span>{" "}
          <span className={styles.summaryValue}>{selectedLabelText}</span>
        </span>
        <span>
          <span className={styles.summaryKey}>Đáp án:</span>{" "}
          <span className={styles.summaryValue}>{correctLabelText}</span>
        </span>
      </div>
    </section>
  );
}

function ShortAnswerReview({
  question,
  answer,
}: {
  question: AttemptReviewQuestion;
  answer?: AttemptAnswer;
}) {
  const userAnswer = answer?.textAnswer ?? null;
  const keys = question.shortAnswerKeys ?? [];

  const acceptable =
    keys.length > 0 ? keys.map((k) => k.acceptableAnswer).join(" • ") : "—";

  return (
    <section aria-label="Đáp án tự luận ngắn">
      <div className={styles.answerBox}>
        <div className={styles.answerTitle}>Câu trả lời của bạn</div>
        <div className={styles.answerBody}>
          {userAnswer ? (
            <RichText
              content={userAnswer}
              variant="inline"
              allowLinks={false}
            />
          ) : (
            "—"
          )}
        </div>
      </div>

      <div className={styles.answerBox}>
        <div className={styles.answerTitle}>Đáp án</div>
        <div className={styles.answerBody}>{acceptable}</div>
      </div>
    </section>
  );
}

type QuestionStatus = "correct" | "wrong" | "ungraded" | "unanswered";

function buildBadge(status: QuestionStatus) {
  switch (status) {
    case "correct":
      return (
        <span className={`${styles.badge} ${styles.badgeCorrect}`}>
          <CheckCircleIcon size={16} color="currentColor" />
          Đúng
        </span>
      );
    case "wrong":
      return (
        <span className={`${styles.badge} ${styles.badgeWrong}`}>
          <XCircleIcon size={16} color="currentColor" />
          Sai
        </span>
      );
    case "unanswered":
      return (
        <span className={`${styles.badge} ${styles.badgeWarn}`}>
          <WarningCircleIcon size={16} color="currentColor" />
          Bỏ trống
        </span>
      );
    default:
      return (
        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
          <MinusCircleIcon size={16} color="currentColor" />
          Chưa chấm
        </span>
      );
  }
}

type IconProps = {
  size: number;
  color: string;
};

function IconBase({
  size,
  color,
  children,
}: IconProps & {
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function CircleIcon({ size, color }: IconProps) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="12" cy="12" r="9" />
    </IconBase>
  );
}

function CheckCircleIcon({ size, color }: IconProps) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </IconBase>
  );
}

function XCircleIcon({ size, color }: IconProps) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </IconBase>
  );
}

function MinusCircleIcon({ size, color }: IconProps) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
    </IconBase>
  );
}

function WarningCircleIcon({ size, color }: IconProps) {
  return (
    <IconBase size={size} color={color}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 16h.01" />
    </IconBase>
  );
}

function formatOptionLabel(option: { label: string | null; position: number }) {
  if (option.label) return option.label;
  if (option.position >= 1 && option.position <= 26) {
    return String.fromCharCode(64 + option.position);
  }
  return String(option.position);
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

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getQuestionStatus(
  question: AttemptReviewQuestion,
  answer?: AttemptAnswer,
  options?: { detailUnavailable: boolean },
): QuestionStatus {
  const detailUnavailable = options?.detailUnavailable ?? false;
  if (!answer) return detailUnavailable ? "ungraded" : "unanswered";

  const hasTypedAnswer = Boolean(answer.textAnswer);
  const hasSelectedOptions = Boolean(answer.selectedOptionIds?.length);
  const hasJudgement = typeof answer.isCorrect === "boolean";
  const answered =
    question.type === "short_answer"
      ? hasTypedAnswer || hasJudgement
      : hasSelectedOptions || hasJudgement;

  if (!answered) return "unanswered";
  if (answer?.isCorrect === true) return "correct";
  if (answer?.isCorrect === false) return "wrong";
  return "ungraded";
}

function metaToneClass(tone: "primary" | "success" | "warning" | "muted") {
  switch (tone) {
    case "primary":
      return styles.metaTonePrimary;
    case "success":
      return styles.metaToneSuccess;
    case "warning":
      return styles.metaToneWarn;
    default:
      return styles.metaToneMuted;
  }
}

function navToneClass(status: QuestionStatus) {
  switch (status) {
    case "correct":
      return styles.navItemCorrect;
    case "wrong":
      return styles.navItemWrong;
    case "unanswered":
      return styles.navItemUnanswered;
    default:
      return styles.navItemUngraded;
  }
}

function questionToneClass(status: QuestionStatus) {
  switch (status) {
    case "correct":
      return styles.questionToneCorrect;
    case "wrong":
      return styles.questionToneWrong;
    case "unanswered":
      return styles.questionToneUnanswered;
    default:
      return styles.questionToneUngraded;
  }
}

function formatDurationFromIso(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) return null;
  const started = new Date(startedAt);
  const submitted = new Date(submittedAt);
  if (Number.isNaN(started.getTime()) || Number.isNaN(submitted.getTime())) {
    return null;
  }
  const diffSeconds = Math.max(
    0,
    Math.round((submitted.getTime() - started.getTime()) / 1000),
  );
  if (diffSeconds < 60) return `${diffSeconds}s`;
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  if (minutes < 60) return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  const minutesRemainder = minutes % 60;
  return `${hours}h${String(minutesRemainder).padStart(2, "0")}m`;
}
