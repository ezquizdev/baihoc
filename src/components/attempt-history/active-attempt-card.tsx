"use client";

import Link from "next/link";
import type { ActiveAttemptSummary } from "@/application/models/attempt";
import { DifficultyBadge } from "@/components/quiz-catalog/quiz-badges";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./attempt-history.module.css";

export function ActiveAttemptCard({
  attempt,
}: {
  attempt: ActiveAttemptSummary;
}) {
  const quizTitle = attempt.quizTitle ?? "Quiz";
  const startedRelative = formatRelativeTimeVi(attempt.startedAt);
  const startedDate = formatDateVi(attempt.startedAt);
  const minutesEstimate =
    attempt.quizEstimatedTimeSeconds !== null
      ? Math.round(attempt.quizEstimatedTimeSeconds / 60)
      : null;

  const remainingSeconds = computeClampedRemainingSeconds(attempt);
  const remainingLabel =
    remainingSeconds !== null ? formatClock(remainingSeconds) : null;

  return (
    <article
      className={`${styles.card} ${styles.activeCard}`.trim()}
      aria-label={`Lượt làm đang diễn ra: ${quizTitle}`}
    >
      <div className={styles.cardMain}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{quizTitle}</h2>
          <div className={styles.badgeStack}>
            <span className={`${styles.tag} ${styles.tagRunning}`}>
              Đang làm
            </span>
            {attempt.isChallenge ? (
              <span className={`${styles.tag} ${styles.tagChallenge}`}>
                Challenge
              </span>
            ) : null}
            {attempt.customQuizId ? (
              <span className={`${styles.tag} ${styles.tagCustom}`}>
                Quiz tự tạo
              </span>
            ) : null}
            <DifficultyBadge difficulty={attempt.quizDifficulty} />
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span className={styles.metaKey}>Bắt đầu</span> {startedRelative} •{" "}
            {startedDate}
          </span>
          {remainingLabel ? (
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Còn lại</span> {remainingLabel}
            </span>
          ) : null}
          {minutesEstimate !== null ? (
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>Dự kiến</span> {minutesEstimate}{" "}
              phút
            </span>
          ) : null}
        </div>
      </div>

      <aside className={styles.cardAside} aria-label="Hành động">
        <div className={styles.asideMeta}>
          <div>
            <span className={styles.metaKey}>Trạng thái</span> Đang làm dở
          </div>
          {remainingLabel ? (
            <div>
              <span className={styles.metaKey}>Còn lại</span> {remainingLabel}
            </div>
          ) : (
            <div>
              <span className={styles.metaKey}>Thời gian</span> Không giới hạn
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <Link
            className={styles.primaryAction}
            href={`/attempts/${attempt.attemptId}`}
          >
            Tiếp tục
          </Link>
        </div>
      </aside>
    </article>
  );
}

function computeClampedRemainingSeconds(attempt: {
  startedAt: string;
  timeLimitSeconds: number | null;
  remainingSeconds: number | null;
}) {
  if (attempt.timeLimitSeconds === null) return null;
  const startedMs = new Date(attempt.startedAt).getTime();
  if (Number.isNaN(startedMs)) return null;
  const elapsedSeconds = Math.floor((Date.now() - startedMs) / 1000);
  const serverRemaining = Math.max(
    0,
    attempt.timeLimitSeconds - elapsedSeconds,
  );
  const stored = attempt.remainingSeconds ?? serverRemaining;
  return Math.min(serverRemaining, stored);
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
