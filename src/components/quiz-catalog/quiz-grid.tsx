"use client";

import type { QuizCatalogItem } from "@/application/models/quiz";
import { QuizCard } from "./quiz-card";
import styles from "./quiz-catalog.module.css";

type QuizGridProps = {
  items: QuizCatalogItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect?: (quiz: QuizCatalogItem) => void;
  onStart?: (quiz: QuizCatalogItem) => void;
};

export function QuizGrid({
  items,
  isLoading,
  error,
  onRetry,
  onSelect,
  onStart,
}: QuizGridProps) {
  if (error) {
    return (
      <div className={`${styles.quizGridArea} ${styles.quizGridAreaCenter}`}>
        <div className={styles.stateCard} role="alert">
          {error}
          <div>
            <button
              className={styles.stateAction}
              type="button"
              onClick={onRetry}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={`${styles.quizGridArea} ${styles.quizGridAreaCenter}`}>
        {!isLoading ? (
          <output className={styles.stateCard}>
            Không tìm thấy quiz phù hợp.
          </output>
        ) : null}
        {isLoading ? (
          <output className={styles.quizGridLoading} aria-live="polite">
            Đang tải danh sách quiz...
          </output>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.quizGridArea}>
      <ul className={styles.quizGrid} aria-label="Danh sách quiz">
        {items.map((quiz) => (
          <li key={quiz.id} className={styles.quizGridItem}>
            <QuizCard quiz={quiz} onSelect={onSelect} onStart={onStart} />
          </li>
        ))}
      </ul>

      {isLoading ? (
        <output className={styles.quizGridLoading} aria-live="polite">
          Đang tải danh sách quiz...
        </output>
      ) : null}
    </div>
  );
}
