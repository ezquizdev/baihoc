"use client";

import { useEffect, useId, useRef } from "react";
import type { ConfirmVariant } from "./confirm-modal";
import styles from "./notice-modal.module.css";

type TextAreaModalProps = {
  open: boolean;
  title: string;
  message?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  primaryLabel?: string;
  primaryVariant?: ConfirmVariant;
  secondaryLabel?: string;
  disablePrimary?: boolean;
  autoSelect?: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose: () => void;
};

export function TextAreaModal({
  open,
  title,
  message,
  value,
  onChange,
  placeholder,
  helpText,
  primaryLabel = "Đóng",
  primaryVariant = "primary",
  secondaryLabel,
  disablePrimary,
  autoSelect,
  onPrimary,
  onSecondary,
  onClose,
}: TextAreaModalProps) {
  const titleId = useId();
  const messageId = useId();
  const helpId = useId();
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const hadModalOpenClassRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    hadModalOpenClassRef.current =
      document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");

    requestAnimationFrame(() => {
      if (autoSelect) {
        textareaRef.current?.focus();
        textareaRef.current?.select();
        return;
      }
      primaryRef.current?.focus();
    });

    return () => {
      if (!hadModalOpenClassRef.current) {
        document.body.classList.remove("modal-open");
      }
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
      hadModalOpenClassRef.current = false;
    };
  }, [autoSelect, open]);

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

  const primaryClassName = `${styles.btn} ${
    primaryVariant === "danger" ? styles.btnDanger : ""
  }`.trim();

  const describedBy = [message ? messageId : null, helpText ? helpId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy || undefined}
      >
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        {message ? (
          <p id={messageId} className={styles.message}>
            {message}
          </p>
        ) : null}

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={4}
          value={value}
          readOnly={!onChange}
          placeholder={placeholder}
          aria-label={title}
          aria-describedby={helpText ? helpId : undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />

        {helpText ? (
          <p id={helpId} className={styles.help}>
            {helpText}
          </p>
        ) : null}

        <div className={styles.actions}>
          {onSecondary && secondaryLabel ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            ref={primaryRef}
            type="button"
            className={primaryClassName}
            onClick={onPrimary}
            disabled={disablePrimary}
          >
            {primaryLabel}
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
