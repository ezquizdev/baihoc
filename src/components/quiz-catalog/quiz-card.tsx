"use client";

import type { QuizCatalogItem } from "@/application/models/quiz";
import styles from "./quiz-catalog.module.css";

const difficultyLabels: Record<QuizCatalogItem["difficulty"], string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
  mixed: "Tổng hợp",
};

export function QuizCard({
  quiz,
  tone,
}: {
  quiz: QuizCatalogItem;
  tone?: "alt";
}) {
  const minutes = quiz.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : null;
  const questionCount = quiz.questionCount ?? 0;
  const dateLabel = formatDate(quiz.updatedAt ?? quiz.createdAt);
  const diffLabel = difficultyLabels[quiz.difficulty];
  const subjectClass = subjectPillClass(quiz.subjectSlug);
  const ctaLabel = quiz.isChallenge ? "Thử thách ngay" : "Làm ngay";

  return (
    <article
      className={`${styles.quizCard} ${tone === "alt" ? styles.quizCardAlt : ""}`}
      aria-label={`Quiz ${quiz.title}`}
    >
      <div className={styles.quizTop}>
        <span className={styles.date}>{dateLabel}</span>
        <div className={styles.badges}>
          {quiz.visibility === "premium" ? (
            <span className={styles.vip}>VIP</span>
          ) : null}
          <button className={styles.bookmark} type="button" aria-label="Lưu quiz" />
        </div>
      </div>

      <div className={styles.quizBody}>
        <div className={styles.quizTitle}>{quiz.title}</div>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.icon} aria-hidden="true" />
            {formatNumber(quiz.attemptCount)} lượt
          </div>
          <div className={styles.metaItem}>
            <span className={`${styles.icon} ${styles.iconPaper}`} aria-hidden="true" />
            {questionCount} câu
          </div>
          <div className={styles.metaItem}>
            <span className={`${styles.icon} ${styles.iconHour}`} aria-hidden="true" />
            {minutes !== null ? `${minutes} phút` : "— phút"}
          </div>
        </div>

        <div className={styles.quizTags}>
          <span
            className={`${styles.pill} ${difficultyClass(quiz.difficulty, styles)}`}
          >
            {diffLabel}
          </span>
          <span className={`${styles.subjectPill} ${subjectClass}`}>
            <span className={styles.subjectDot} aria-hidden="true" />
            {quiz.subjectName}
          </span>
        </div>
      </div>

      <div
        className={`${styles.quizCta} ${
          quiz.isChallenge ? styles.quizCtaChallenge : ""
        }`}
      >
        <button className={styles.quizCtaButton} type="button">
          {ctaLabel}
          <span className={styles.chev} aria-hidden="true" />
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

function subjectPillClass(slug: string) {
  const normalized = slug.toLowerCase();
  if (normalized.includes("math")) return styles.subjectMath;
  if (normalized.includes("sci")) return styles.subjectSci;
  if (normalized.includes("vi")) return styles.subjectVi;
  if (normalized.includes("en")) return styles.subjectEn;
  return "";
}

function difficultyClass(
  difficulty: QuizCatalogItem["difficulty"],
  moduleStyles: typeof styles,
) {
  switch (difficulty) {
    case "easy":
      return moduleStyles.diffEasy;
    case "medium":
      return moduleStyles.diffMedium;
    case "hard":
      return moduleStyles.diffHard;
    case "mixed":
    default:
      return moduleStyles.diffMixed;
  }
}
