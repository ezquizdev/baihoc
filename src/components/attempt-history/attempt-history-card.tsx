"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  Lightning,
  Notebook,
  Sparkle,
  Timer,
  TrashSimple,
  Trophy,
} from "phosphor-react";
import type { CSSProperties } from "react";
import type { AttemptHistoryItem } from "@/application/models/attempt";
import {
  DifficultyBadge,
  SubjectBadge,
} from "@/components/quiz-catalog/quiz-badges";
import {
  formatDateVi,
  formatNumberVi,
  formatRelativeTimeVi,
} from "@/lib/formatters";
import styles from "./attempt-history.module.css";

export function AttemptHistoryCard({ item }: { item: AttemptHistoryItem }) {
  const quizTitle = item.quizTitle ?? "Quiz";
  const completedAt = item.submittedAt ?? item.startedAt;
  const completedRelative = formatRelativeTimeVi(completedAt);
  const completedDate = formatDateVi(completedAt);
  const minutesEstimate =
    item.quizEstimatedTimeSeconds !== null
      ? Math.round(item.quizEstimatedTimeSeconds / 60)
      : null;

  const durationLabel = formatDurationFromIso(item.startedAt, item.submittedAt);
  const score = clampPercent(item.scorePercent);
  const scoreStyle = getScoreStyle(score);
  const subjectScores = item.subjectScores ?? [];
  const shownSubjects = subjectScores.slice(0, 4);
  const hiddenCount = Math.max(subjectScores.length - shownSubjects.length, 0);
  const tone = !item.quizExists
    ? "deleted"
    : item.isChallenge
      ? "challenge"
      : item.customQuiz
        ? "custom"
        : "practice";
  const cardToneClass =
    tone === "deleted"
      ? styles.cardToneDeleted
      : tone === "challenge"
        ? styles.cardToneChallenge
        : tone === "custom"
          ? styles.cardToneCustom
          : styles.cardTonePractice;
  const RailIcon =
    tone === "deleted"
      ? TrashSimple
      : tone === "challenge"
        ? Trophy
        : tone === "custom"
          ? Sparkle
          : Notebook;

  return (
    <article
      className={`${styles.card} ${cardToneClass}`.trim()}
      aria-label={`Kết quả ${quizTitle}`}
    >
      <div className={styles.cardRail} aria-hidden="true">
        <div className={styles.cardRailInner}>
          <RailIcon size={22} weight="bold" />
        </div>
      </div>

      <div className={styles.cardMain}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{quizTitle}</h2>
          <div className={styles.badgeStack}>
            {!item.quizExists ? (
              <span className={`${styles.tag} ${styles.tagDeleted}`}>
                Đã xoá
              </span>
            ) : null}
            {item.isChallenge ? (
              <span className={`${styles.tag} ${styles.tagChallenge}`}>
                Challenge
              </span>
            ) : null}
            {item.customQuiz ? (
              <span className={`${styles.tag} ${styles.tagCustom}`}>
                Quiz tự tạo
              </span>
            ) : null}
            {item.subjectScoresEstimated ? (
              <span className={`${styles.tag} ${styles.tagEstimated}`}>
                Ước tính
              </span>
            ) : null}
            <DifficultyBadge difficulty={item.quizDifficulty} />
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span
              className={`${styles.metaIcon} ${styles.metaIconPrimary}`}
              aria-hidden="true"
            >
              <CalendarCheck size={12} weight="bold" />
            </span>
            <span className={styles.metaKey}>Hoàn thành</span>{" "}
            {completedRelative} • {completedDate}
          </span>
          <span className={styles.metaItem}>
            <span
              className={`${styles.metaIcon} ${styles.metaIconSuccess}`}
              aria-hidden="true"
            >
              <CheckCircle size={12} weight="bold" />
            </span>
            <span className={styles.metaKey}>Đúng</span> {item.correctCount}/
            {item.totalQuestions}
          </span>
          <span className={styles.metaItem}>
            <span
              className={`${styles.metaIcon} ${styles.metaIconAccent}`}
              aria-hidden="true"
            >
              <Lightning size={12} weight="bold" />
            </span>
            <span className={styles.metaKey}>ĐNL</span>{" "}
            {formatNumberVi(item.xpEarned)}
          </span>
          {minutesEstimate !== null ? (
            <span className={styles.metaItem}>
              <span
                className={`${styles.metaIcon} ${styles.metaIconClock}`}
                aria-hidden="true"
              >
                <Clock size={12} weight="bold" />
              </span>
              <span className={styles.metaKey}>Dự kiến</span> {minutesEstimate}{" "}
              phút
            </span>
          ) : null}
          {durationLabel ? (
            <span className={styles.metaItem}>
              <span
                className={`${styles.metaIcon} ${styles.metaIconClock}`}
                aria-hidden="true"
              >
                <Timer size={12} weight="bold" />
              </span>
              <span className={styles.metaKey}>Thời gian</span> {durationLabel}
            </span>
          ) : null}
        </div>

        {shownSubjects.length ? (
          <section className={styles.subjectRow} aria-label="Điểm theo môn">
            {shownSubjects.map((subject) => {
              const subjectScore = clampPercent(subject.scorePercent);
              return (
                <div key={subject.subjectId} className={styles.subjectScore}>
                  <div className={styles.subjectMeta}>
                    <SubjectBadge name={subject.name} slug={subject.slug} />
                    <span className={styles.subjectPercent}>
                      {Math.round(subjectScore)}%
                    </span>
                  </div>
                  <div className={styles.subjectMeta}>
                    <span className={styles.subjectDetail}>
                      {subject.correctCount}/{subject.totalQuestions} đúng
                    </span>
                  </div>
                  <div className={styles.subjectBar} aria-hidden="true">
                    <div
                      className={styles.subjectBarFill}
                      style={{ width: `${subjectScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {hiddenCount > 0 ? (
              <div className={styles.subjectScore}>
                <div className={styles.subjectMeta}>
                  <span className={styles.subjectPercent}>+{hiddenCount}</span>
                  <span className={styles.subjectDetail}>môn khác</span>
                </div>
                <div className={styles.subjectBar} aria-hidden="true" />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <aside className={styles.cardAside} aria-label="Tóm tắt">
        <div className={styles.asideTop}>
          <div
            className={styles.scoreRing}
            style={scoreStyle}
            role="img"
            aria-label={`Điểm ${Math.round(score)} phần trăm`}
          >
            <div className={styles.scoreRingInner}>
              <span className={styles.scoreValue}>{Math.round(score)}%</span>
            </div>
          </div>

          <div className={styles.asideTopMeta}>
            <div className={styles.asideTopLabel}>Điểm</div>
            <div className={styles.asideTopValue}>
              {item.scorePercent.toFixed(2)}%
            </div>
            <div className={styles.asideTopSub}>
              {item.correctCount}/{item.totalQuestions} đúng
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            className={styles.primaryAction}
            href={`/attempts/${item.attemptId}/results`}
          >
            Xem kết quả
          </Link>
          {item.canRedo ? (
            <Link
              className={styles.secondaryAction}
              href={`/quizzes/${item.quizId}/attempt`}
            >
              {item.isChallenge ? "Xem lại" : "Làm lại"}
            </Link>
          ) : (
            <span className={styles.secondaryActionDisabled} aria-disabled>
              {item.quizExists ? "Quiz đã được lưu trữ" : "Không thể làm lại"}
            </span>
          )}
        </div>
      </aside>
    </article>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getScoreStyle(score: number): CSSProperties {
  return { "--score": `${score}%` } as CSSProperties;
}

function formatDurationFromIso(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) return null;
  const start = new Date(startedAt);
  const end = new Date(submittedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffSeconds = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 1000),
  );
  return formatClock(diffSeconds);
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
