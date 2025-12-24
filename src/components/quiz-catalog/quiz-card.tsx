"use client";

import { BookmarkSimple, Clock, ListChecks, UsersThree } from "phosphor-react";
import { useState } from "react";
import type { QuizCatalogItem } from "@/application/models/quiz";
import { formatDateVi, formatNumberVi } from "@/lib/formatters";
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
  const [bookmarked, setBookmarked] = useState(false);
  const minutes = quiz.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : null;
  const questionCount = quiz.questionCount ?? 0;
  const dateLabel = formatDateVi(quiz.updatedAt ?? quiz.createdAt);
  const ctaLabel = quiz.isChallenge ? "Thử thách ngay" : "Làm ngay";
  const subjectBreakdown = quiz.subjectBreakdown ?? [];
  const isMultiSubject = subjectBreakdown.length > 1;
  const showDifficulty = Number.isFinite(quiz.difficulty);
  const subjectBadge = isMultiSubject
    ? { name: "Tổng hợp", slug: "mixed" }
    : { name: quiz.subjectName, slug: quiz.subjectSlug };

  const handleSelect = () => {
    onSelect?.(quiz);
  };

  return (
    <article
      className={`${styles.quizCard} ${tone === "alt" ? styles.quizCardAlt : ""}`}
    >
      <button
        type="button"
        className={styles.quizCardButton}
        aria-label={`Quiz ${quiz.title}`}
        onClick={handleSelect}
      />
      <div className={styles.quizHead}>
        <span className={styles.quizDate}>{dateLabel}</span>
        {quiz.visibility === "premium" ? (
          <span className={styles.vip}>VIP</span>
        ) : null}
        <span className={styles.spacer} aria-hidden="true" />
        <button
          className={`${styles.bookmark} ${
            bookmarked ? styles.bookmarkActive : ""
          }`}
          type="button"
          aria-label="Lưu quiz"
          onClick={(event) => {
            event.stopPropagation();
            setBookmarked((prev) => !prev);
          }}
        >
          <BookmarkSimple
            size={18}
            weight={bookmarked ? "fill" : "bold"}
            color={bookmarked ? "#ffd400" : "#2b3b55"}
          />
        </button>
      </div>

      <div className={styles.quizBody}>
        <div className={styles.quizTitle}>{quiz.title}</div>

        <div className={styles.quizInfo}>
          <div className={styles.quizMeta}>
            <div className={styles.quizMetaItem}>
              <span className={styles.metaIcon} aria-hidden="true">
                <UsersThree size={12} weight="bold" />
              </span>
              {formatNumberVi(quiz.attemptCount)} lượt
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
            {showDifficulty ? (
              <DifficultyBadge difficulty={quiz.difficulty} />
            ) : null}
            <SubjectBadge name={subjectBadge.name} slug={subjectBadge.slug} />
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
          {quiz.isChallenge ? (
            <>
              <span className={styles.quizCtaArrow} aria-hidden="true" />
              <span
                className={`${styles.quizCtaArrow} ${styles.quizCtaArrowRight}`}
                aria-hidden="true"
              />
            </>
          ) : null}
        </button>
      </div>
    </article>
  );
}
