"use client";

import { Clock, ListChecks, UsersThree } from "phosphor-react";
import { useEffect, useRef } from "react";
import type { QuizCatalogItem } from "@/application/models/quiz";
import { DifficultyBadge } from "./quiz-badges";
import styles from "./quiz-modal.module.css";
import { getSubjectTone, isMixedSubject } from "./subject-tone";

type QuizModalProps = {
  quiz: QuizCatalogItem | null;
  onClose: () => void;
  onStart?: (quiz: QuizCatalogItem) => void;
};

export function QuizModal({ quiz, onClose, onStart }: QuizModalProps) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!quiz) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.classList.add("modal-open");
    primaryRef.current?.focus();
    return () => {
      document.body.classList.remove("modal-open");
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    };
  }, [quiz]);

  useEffect(() => {
    if (!quiz) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;
      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isShift = event.shiftKey;

      if (isShift) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [quiz, onClose]);

  if (!quiz) return null;

  const minutes = quiz.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : 0;
  const questionCount = quiz.questionCount ?? 0;
  const isDone = Boolean(quiz.userAttempted);
  const ctaLabel = isDone
    ? "Làm lại"
    : quiz.isChallenge
      ? "Thử thách ngay"
      : "Làm bài ngay";
  const subjectBreakdown = quiz.subjectBreakdown?.length
    ? quiz.subjectBreakdown
    : [
        {
          subjectId: quiz.subjectSlug ?? "mixed",
          name: quiz.subjectName,
          slug: quiz.subjectSlug,
          questionCount,
        },
      ];

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-modal-title"
      >
        <h2 id="quiz-modal-title" className={styles.title}>
          {quiz.title}
        </h2>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>Thông tin quiz</div>
            {quiz.visibility === "premium" ? (
              <span className={styles.vip}>VIP</span>
            ) : null}
          </div>

          <div className={styles.desc}>
            <span className={styles.descLabel}>Mô tả quiz:</span>
            <span className={styles.descText}>{quiz.description ?? "—"}</span>
          </div>

          <div className={styles.grid}>
            <div className={styles.topics}>
              {subjectBreakdown.map((subject) => (
                <div
                  key={subject.subjectId}
                  className={`${styles.topic} ${topicToneClass(
                    subject.slug,
                    styles,
                  )}`.trim()}
                >
                  <div className={styles.topicLeft}>
                    <span className={styles.topicFlag} aria-hidden="true" />
                    <span className={styles.topicName}>{subject.name}</span>
                  </div>
                  <span className={styles.topicCount}>
                    {subject.questionCount} câu
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.right}>
              <DifficultyBadge
                difficulty={quiz.difficulty}
                className={styles.modalDifficulty}
              />
              <div className={styles.meta}>
                <div className={styles.metaRow}>
                  <span className={styles.metaIcon} aria-hidden="true">
                    <UsersThree size={12} weight="bold" />
                  </span>
                  <span>
                    <b>{quiz.attemptCount}</b> lượt thi
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaIcon} aria-hidden="true">
                    <ListChecks size={12} weight="bold" />
                  </span>
                  <span>
                    <b>{questionCount}</b> câu
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span
                    className={`${styles.metaIcon} ${styles.metaIconClock}`}
                    aria-hidden="true"
                  >
                    <Clock size={12} weight="bold" />
                  </span>
                  <span>
                    <b>{minutes}</b> phút
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            ref={primaryRef}
            className={styles.primary}
            type="button"
            onClick={() => onStart?.(quiz)}
          >
            {ctaLabel}
          </button>
          <button className={styles.secondary} type="button" onClick={onClose}>
            Trở lại
          </button>
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ];
  return Array.from(
    container.querySelectorAll<HTMLElement>(selectors.join(",")),
  ).filter((node) => node.getClientRects().length > 0);
}

function topicToneClass(slug: string, moduleStyles: typeof styles) {
  if (isMixedSubject(slug)) return moduleStyles.topicMixed;
  const tone = getSubjectTone(slug);
  switch (tone) {
    case "vi":
      return moduleStyles.topicVi;
    case "en":
      return moduleStyles.topicEn;
    case "math":
      return moduleStyles.topicMath;
    case "sci":
      return moduleStyles.topicSci;
    default:
      return "";
  }
}
