import styles from "./daily-challenge-card.module.css";

type AnswerOption = {
  text: string;
  isActive?: boolean;
};

type DailyChallengeCardProps = {
  tag: string;
  titleLines: string[];
  question: string;
  answers: AnswerOption[];
  className?: string;
};

export function DailyChallengeCard({
  tag,
  titleLines,
  question,
  answers,
  className,
}: DailyChallengeCardProps) {
  return (
    <section
      className={`${styles.card} ${className ?? ""}`}
      aria-label="Daily challenge"
    >
      <div className={styles.left}>
        <div className={styles.tag}>
          <span
            className={`${styles.bolt} ${styles.boltTl}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.bolt} ${styles.boltBl}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.bolt} ${styles.boltTr}`}
            aria-hidden="true"
          />
          <span
            className={`${styles.bolt} ${styles.boltBr}`}
            aria-hidden="true"
          />
          {tag}
        </div>

        <div className={styles.titleWrap} aria-hidden="true">
          <div className={styles.quizShape} />
          <div className={styles.quizName}>{titleLines.join("\n")}</div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.question}>{question}</div>

        <ul className={styles.answers} aria-label="Lựa chọn">
          {answers.map((option) => (
            <li
              key={option.text}
              className={`${styles.pill} ${option.isActive ? styles.active : ""}`}
            >
              {option.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
