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
};

export function QuizGrid({
  items,
  isLoading,
  error,
  onRetry,
  onSelect,
}: QuizGridProps) {
  if (isLoading) {
    return (
      <div className={styles.stateCard} role="status" aria-live="polite">
        Đang tải danh sách quiz...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button className={styles.stateAction} type="button" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.stateCard} role="status">
        Không tìm thấy quiz phù hợp.
      </div>
    );
  }

  return (
    <div className={styles.quizGrid} aria-label="Danh sách quiz">
      {items.map((quiz, index) => (
        <QuizCard
          key={quiz.id}
          quiz={quiz}
          tone={index % 2 === 1 ? "alt" : undefined}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
