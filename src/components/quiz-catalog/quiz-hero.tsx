"use client";

import styles from "./quiz-catalog.module.css";

export function QuizHero() {
  return (
    <section className={`${styles.card} ${styles.hero}`} aria-label="Quiz hero">
      <div>
        <h1 className={styles.heroTitle}>
          <span>Làm</span>Quiz Thôi!!!
        </h1>
        <p className={styles.heroText}>
          Chọn quiz phù hợp với bạn, lọc theo môn học/độ khó và bắt đầu ngay.
        </p>
      </div>
      <div className={styles.heroFigure} aria-hidden="true">
        <div className={styles.heroHead} />
        <div className={styles.heroArm} />
        <div className={styles.heroBody} />
      </div>
    </section>
  );
}
