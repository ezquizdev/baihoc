"use client";

import { Clock, ListChecks, UsersThree } from "phosphor-react";
import type { QuizCatalogItem } from "@/application/models/quiz";
import { DifficultyBadge, SubjectBadge } from "./quiz-badges";
import styles from "./quiz-catalog.module.css";

export function QuizCard({
  quiz,
  tone,
  onSelect,
}: {
  quiz: QuizCatalogItem;
  tone?: "alt";
  onSelect?: (quiz: QuizCatalogItem) => void;
}) {
  const minutes = quiz.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : null;
  const questionCount = quiz.questionCount ?? 0;
  const dateLabel = formatDate(quiz.updatedAt ?? quiz.createdAt);
  const ctaLabel = quiz.isChallenge ? "Thử thách ngay" : "Làm ngay";

  const handleSelect = () => {
    onSelect?.(quiz);
  };

  return (
    <article
      className={`${styles.quizCard} ${tone === "alt" ? styles.quizCardAlt : ""}`}
      aria-label={`Quiz ${quiz.title}`}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
    >
      <div className={styles.quizHead}>
        <span className={styles.quizDate}>{dateLabel}</span>
        {quiz.visibility === "premium" ? (
          <span className={styles.vip}>VIP</span>
        ) : null}
        <span className={styles.spacer} aria-hidden="true" />
        <button
          className={styles.bookmark}
          type="button"
          aria-label="Lưu quiz"
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      <div className={styles.quizBody}>
        <div className={styles.quizTitle}>{quiz.title}</div>

        <div className={styles.quizInfo}>
          <div className={styles.quizMeta}>
            <div className={styles.quizMetaItem}>
              <span className={styles.metaIcon} aria-hidden="true">
                <UsersThree size={12} weight="bold" />
              </span>
              {formatNumber(quiz.attemptCount)} lượt
            </div>
            <div className={styles.quizMetaItem}>
              <span className={styles.metaIcon} aria-hidden="true">
                <ListChecks size={12} weight="bold" />
              </span>
              {questionCount} câu
            </div>
            <div className={styles.quizMetaItem}>
              <span
                className={`${styles.metaIcon} ${styles.metaIconClock}`}
                aria-hidden="true"
              >
                <Clock size={12} weight="bold" />
              </span>
              {minutes !== null ? `${minutes} phút` : "— phút"}
            </div>
          </div>

          <div className={styles.quizBadgeStack}>
            <DifficultyBadge difficulty={quiz.difficulty} />
            <SubjectBadge name={quiz.subjectName} slug={quiz.subjectSlug} />
          </div>
        </div>

        <button
          type="button"
          className={`${styles.quizCta} ${
            quiz.isChallenge ? styles.quizCtaChallenge : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
        >
          {ctaLabel}
          <span className={styles.quizCtaArrow} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("vi-VN");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}
