"use client";

import styles from "./quiz-catalog.module.css";

type QuizHeroProps = {
  onGenerateCustomQuiz?: () => void;
};

export function QuizHero({ onGenerateCustomQuiz }: QuizHeroProps) {
  return (
    <section className={`cardBase ${styles.hero}`} aria-label="Quiz hero">
      <div>
        <h1 className={styles.heroTitle}>
          <span>Làm</span>Quiz Thôi!!!
        </h1>
        <p className={styles.heroText}>
          Chọn quiz phù hợp với bạn, lọc theo môn học/độ khó và bắt đầu ngay.
        </p>
        {onGenerateCustomQuiz ? (
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroCta}
              onClick={onGenerateCustomQuiz}
            >
              Tạo quiz tuỳ chỉnh
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.heroFigure} aria-hidden="true">
        <div className={styles.heroHead} />
        <div className={styles.heroArm} />
        <div className={styles.heroBody} />
      </div>
    </section>
  );
}
