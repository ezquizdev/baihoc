"use client";

import type { QuizListItem } from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import { StaffQuizCard } from "./staff-quiz-card";
import styles from "./staff-quiz-grid.module.css";

type StaffQuizGridProps = {
  items: QuizListItem[];
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (quizId: string) => void;
  onMutated: () => void;
  onCardError: (title: string, message: string) => void;
};

export function StaffQuizGrid({
  items,
  subjects,
  isLoading,
  error,
  onRetry,
  onEdit,
  onMutated,
  onCardError,
}: StaffQuizGridProps) {
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
            <StaffQuizCard
              quiz={quiz}
              subjects={subjects}
              onEdit={onEdit}
              onMutated={onMutated}
              onError={onCardError}
            />
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
