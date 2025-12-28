import type { ProfileXpSummaryDto } from "@/application/models/profile";
import { ProfileAiSuggestionCard } from "@/components/profile/ProfileAiSuggestionCard";
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
              <div className={styles.subjectHint}>IRT</div>
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

      {showAiSuggestion ? <ProfileAiSuggestionCard /> : null}
    </div>
  );
}
