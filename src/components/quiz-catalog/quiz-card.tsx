"use client";

import { BookmarkSimple, Clock, ListChecks, UsersThree } from "phosphor-react";
import { useState } from "react";
import type { QuizCatalogItem } from "@/application/models/quiz";
import { NoticeModal } from "@/components/ui/notice-modal";
import { formatDateVi, formatNumberVi } from "@/lib/formatters";
import { DifficultyBadge, SubjectBadge } from "./quiz-badges";
import styles from "./quiz-catalog.module.css";

export function QuizCard({
  quiz,
  onSelect,
  onStart,
}: {
  quiz: QuizCatalogItem;
  onSelect?: (quiz: QuizCatalogItem) => void;
  onStart?: (quiz: QuizCatalogItem) => void;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const [startNoticeOpen, setStartNoticeOpen] = useState(false);
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

  const handleStart = () => {
    if (onStart) {
      onStart(quiz);
      return;
    }
    setStartNoticeOpen(true);
  };

  return (
    <>
      <article
        className={`${styles.quizCard} ${
          quiz.isChallenge ? styles.quizCardChallenge : ""
        }`}
      >
        <button
          type="button"
          className={styles.quizCardButton}
          aria-label={`Xem trước quiz ${quiz.title}`}
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
              color={bookmarked ? "var(--accent)" : "var(--text-secondary)"}
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
              handleStart();
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </article>

      <NoticeModal
        open={startNoticeOpen}
        title="Chưa hỗ trợ"
        message="Tính năng làm bài đang được phát triển."
        onClose={() => setStartNoticeOpen(false)}
      />
    </>
  );
}
