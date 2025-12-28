"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef } from "react";
import { RichText } from "@/components/ui/rich-text";
import styles from "./highlight-challenge-result-modal.module.css";

type Option = { id: string; text: string; position: number };

export function HighlightChallengeResultModal({
  open,
  tone,
  title,
  questionStem,
  options,
  selectedOptionIds,
  correctOptionIds,
  explanation,
  actionLabel,
  actionHref,
  onClose,
}: {
  open: boolean;
  tone: "success" | "error";
  title: string;
  questionStem: string;
  options: Option[];
  selectedOptionIds: string[];
  correctOptionIds: string[];
  explanation: string | null;
  actionLabel: string;
  actionHref: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const primaryRef = useRef<HTMLAnchorElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const hadModalOpenClassRef = useRef(false);

  const selectedSet = useMemo(
    () => new Set(selectedOptionIds),
    [selectedOptionIds],
  );
  const correctSet = useMemo(
    () => new Set(correctOptionIds),
    [correctOptionIds],
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    hadModalOpenClassRef.current =
      document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => primaryRef.current?.focus());
    return () => {
      if (!hadModalOpenClassRef.current) {
        document.body.classList.remove("modal-open");
      }
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
      hadModalOpenClassRef.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.dialog} ${
          tone === "success" ? styles.dialogSuccess : styles.dialogError
        }`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        <p id={descriptionId} className={styles.subtitle}>
          Đây là câu hỏi highlight trên dashboard (không tính vào kết quả
          challenge). Hãy bắt đầu challenge đầy đủ để ghi nhận kết quả nhé.
        </p>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Câu hỏi</div>
          <div className={styles.stem}>
            <RichText content={questionStem} allowLinks={false} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Đáp án</div>
          <ul className={styles.optionList} aria-label="Đáp án">
            {options.map((opt) => {
              const isSelected = selectedSet.has(opt.id);
              const isCorrect = correctSet.has(opt.id);
              return (
                <li
                  key={opt.id}
                  className={`${styles.optionRow} ${
                    isCorrect ? styles.optionCorrect : ""
                  } ${isSelected ? styles.optionSelected : ""}`.trim()}
                >
                  <div className={styles.optionText}>
                    <RichText
                      content={opt.text}
                      variant="inline"
                      allowLinks={false}
                    />
                  </div>
                  <div className={styles.optionTags}>
                    {isSelected ? (
                      <span className={styles.tagSelected}>Bạn chọn</span>
                    ) : null}
                    {isCorrect ? (
                      <span className={styles.tagCorrect}>Đúng ✓</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Giải thích</div>
          {explanation ? (
            <div className={styles.explanation}>
              <RichText content={explanation} allowLinks />
            </div>
          ) : (
            <div className={styles.muted}>Chưa có giải thích.</div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onClose}
          >
            Đóng
          </button>
          <Link
            ref={primaryRef}
            className={`${styles.btn} ${
              tone === "success" ? styles.btnSuccess : styles.btnDanger
            }`.trim()}
            href={actionHref}
            onClick={onClose}
          >
            {actionLabel}
          </Link>
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
