import type { ProfileXpSummaryDto } from "@/application/models/profile";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./profile-score-cards.module.css";

type Props = {
  xp: ProfileXpSummaryDto;
  showAiSuggestion?: boolean;
};

function clampBarHeight(value: number, max: number) {
  if (max <= 0) return 14;
  const ratio = value / max;
  const min = 14;
  const maxPx = 64;
  return Math.round(min + (maxPx - min) * Math.min(Math.max(ratio, 0), 1));
}

export function ProfileScoreCards({ xp, showAiSuggestion = true }: Props) {
  const subjectValues = [
    {
      key: "vi",
      name: "Tiếng Việt",
      value: xp.xpVi,
      className: styles.subjectVi,
    },
    {
      key: "en",
      name: "Tiếng Anh",
      value: xp.xpEn,
      className: styles.subjectEn,
    },
    {
      key: "math",
      name: "Toán học",
      value: xp.xpMath,
      className: styles.subjectMath,
    },
    {
      key: "sci",
      name: "Tư duy Khoa học",
      value: xp.xpSci,
      className: styles.subjectSci,
    },
  ] as const;

  const maxSubject = Math.max(...subjectValues.map((s) => s.value), 1);

  return (
    <div className={styles.wrapper}>
      <section className={styles.subjectGrid} aria-label="Năng lực theo môn">
        {subjectValues.map((subject) => (
          <div
            key={subject.key}
            className={`${styles.subjectCard} ${subject.className}`}
          >
            <div>
              <div className={styles.subjectLabel}>Năng lực</div>
              <div className={styles.subjectName}>{subject.name}</div>
            </div>
            <div>
              <div className={styles.subjectValue}>
                {formatNumberVi(subject.value)}
              </div>
              <div className={styles.subjectHint}>XP</div>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.totalCard} aria-label="Tổng điểm năng lực">
        <div className={styles.totalHeader}>
          <h3 className={styles.totalTitle}>Tổng điểm năng lực</h3>
        </div>
        <div className={styles.totalBody}>
          <div className={styles.totalValue}>{formatNumberVi(xp.totalXp)}</div>
          <div className={styles.bars} aria-hidden="true">
            <span
              className={`${styles.bar} ${styles.barVi}`}
              style={{ height: clampBarHeight(xp.xpVi, maxSubject) }}
            />
            <span
              className={`${styles.bar} ${styles.barEn}`}
              style={{ height: clampBarHeight(xp.xpEn, maxSubject) }}
            />
            <span
              className={`${styles.bar} ${styles.barMath}`}
              style={{ height: clampBarHeight(xp.xpMath, maxSubject) }}
            />
            <span
              className={`${styles.bar} ${styles.barSci}`}
              style={{ height: clampBarHeight(xp.xpSci, maxSubject) }}
            />
          </div>
        </div>
      </section>

      {showAiSuggestion ? (
        <section className={styles.aiCard} aria-label="Chiến lược học tập">
          <div className={styles.aiTitleRow}>
            <h3 className={styles.aiTitle}>Chiến lược học tập</h3>
            <span className={styles.aiTag}>AI (sắp ra mắt)</span>
          </div>
          <p className={styles.aiBody}>
            Gợi ý học tập cá nhân hoá từ trợ giảng AI sẽ xuất hiện tại đây sau
            khi bạn hoàn thành thêm vài bài quiz.
          </p>
          <div className={styles.aiButtonRow}>
            <button type="button" className={styles.aiButton} disabled>
              Chat với trợ giảng AI
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
