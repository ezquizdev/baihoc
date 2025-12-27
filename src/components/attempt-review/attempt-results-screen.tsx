"use client";

import Link from "next/link";
import {
  CheckCircle,
  Circle,
  MinusCircle,
  WarningCircle,
  XCircle,
} from "phosphor-react";
import { useState } from "react";
import type {
  AttemptAnswer,
  AttemptReviewQuestion,
  AttemptReviewStateResponse,
} from "@/application/models/attempt";
import { RejudgeAttemptButton } from "@/components/attempt-review/rejudge-attempt-button";
import { RichText } from "@/components/ui/rich-text";
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
    <div className={styles.page}>
      <section className={styles.headerCard} aria-label="Tóm tắt kết quả">
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Kết quả: {quizTitle}</h1>
          <p className={styles.subtitle}>
            Trạng thái: {state.attempt.status} • Đã trả lời {answeredCount}/
            {state.questions.length} câu • Phiên bản chấm: v
            {state.judgementVersion}
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.secondaryAction} href="/dashboard/history">
            Lịch sử
          </Link>
          <Link className={styles.primaryAction} href="/quizzes">
            Quiz khác
          </Link>
        </div>
      </section>

      {showQuizDeletedBanner ? (
        <div className={`${styles.banner} ${styles.bannerDanger}`}>
          Quiz có thể đã bị xoá. Không thể chấm lại, nhưng bạn vẫn có thể xem
          lại kết quả dựa trên dữ liệu đã lưu.
        </div>
      ) : null}

      {showLegacyBanner ? (
        <div className={`${styles.banner} ${styles.bannerMuted}`}>
          Bài làm này chưa có snapshot đầy đủ. Nội dung hiển thị có thể dựa trên
          quiz hiện tại và không phản ánh chính xác lịch sử khi bạn làm bài.
        </div>
      ) : null}

      {showRejudgeBanner ? (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          <div className={styles.bannerRow}>
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
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          Quiz đã thay đổi quá nhiều và không còn câu hỏi nào trùng với lượt làm
          này, nên không thể chấm lại.
        </div>
      ) : null}

      <section className={styles.statsGrid} aria-label="Thống kê">
        <Stat label="Điểm" value={`${state.attempt.scorePercent}%`} />
        <Stat
          label="Đúng"
          value={`${state.attempt.correctCount}/${state.attempt.totalQuestions}`}
        />
        <Stat label="XP" value={`${state.attempt.xpEarned}`} />
      </section>

      <section className={styles.questionList} aria-label="Xem lại từng câu">
        {state.questions.map((question) => (
          <QuestionReviewCard
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
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function QuestionReviewCard({
  question,
  answer,
  passageLabel,
}: {
  question: AttemptReviewQuestion;
  answer?: AttemptAnswer;
  passageLabel?: string;
}) {
  const badge = buildBadge(answer?.isCorrect);
  const answered =
    question.type === "short_answer"
      ? Boolean(answer?.textAnswer)
      : Boolean(answer?.selectedOptionIds?.length);
  const [explanationOpen, setExplanationOpen] = useState(true);
  const explanationId = `explanation-${question.id}`;

  return (
    <article className={styles.questionCard}>
      <header className={styles.questionHeader}>
        <div className={styles.questionTitle}>Câu {question.position}</div>
        {badge}
      </header>

      {!question.exists ? (
        <div className={styles.missingQuestion}>
          Câu hỏi này đã bị xoá nên không thể hiển thị nội dung đầy đủ.
        </div>
      ) : null}

      {question.passage ? (
        <section className={styles.passage} aria-label="Đoạn văn">
          <div className={styles.passageTitle}>
            {passageLabel ?? "Dùng thông tin sau để trả lời các câu liên quan."}
          </div>
          <RichText content={question.passage.content} allowLinks />
        </section>
      ) : null}

      {question.stem ? (
        <RichText content={question.stem} className={styles.stem} allowLinks />
      ) : (
        <div className={styles.stem}>—</div>
      )}

      {question.type === "short_answer" ? (
        <ShortAnswerReview question={question} answer={answer} />
      ) : (
        <McqReview question={question} answer={answer} answered={answered} />
      )}

      {question.exists && question.explanation ? (
        <section className={styles.explanation} aria-label="Giải thích">
          <div className={styles.explanationHeader}>
            <div className={styles.explanationTitle}>Giải thích</div>
            <button
              type="button"
              className={styles.explanationToggle}
              onClick={() => setExplanationOpen((prev) => !prev)}
              aria-expanded={explanationOpen}
              aria-controls={explanationId}
            >
              {explanationOpen ? "Ẩn" : "Hiện"}
            </button>
          </div>
          {explanationOpen ? (
            <div id={explanationId} className={styles.explanationBody}>
              <RichText content={question.explanation} allowLinks />
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
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
    : answered
      ? "Lựa chọn bạn chọn không còn tồn tại."
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
            <CheckCircle
              size={18}
              weight="fill"
              aria-hidden="true"
              style={{ color: "#047857" }}
            />
          ) : isWrongSelected ? (
            <XCircle
              size={18}
              weight="fill"
              aria-hidden="true"
              style={{ color: "#be123c" }}
            />
          ) : isSelectedUnkeyed ? (
            <WarningCircle
              size={18}
              weight="fill"
              aria-hidden="true"
              style={{ color: "#8a6a00" }}
            />
          ) : (
            <Circle
              size={18}
              weight="bold"
              aria-hidden="true"
              style={{ color: "#94a3b8" }}
            />
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

function buildBadge(isCorrect: AttemptAnswer["isCorrect"]) {
  if (isCorrect === undefined) {
    return (
      <span className={`${styles.badge} ${styles.badgeNeutral}`}>
        <MinusCircle size={16} weight="bold" aria-hidden="true" />
        Chưa chấm
      </span>
    );
  }

  if (isCorrect) {
    return (
      <span className={`${styles.badge} ${styles.badgeCorrect}`}>
        <CheckCircle size={16} weight="bold" aria-hidden="true" />
        Đúng
      </span>
    );
  }

  return (
    <span className={`${styles.badge} ${styles.badgeWrong}`}>
      <XCircle size={16} weight="bold" aria-hidden="true" />
      Sai
    </span>
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
