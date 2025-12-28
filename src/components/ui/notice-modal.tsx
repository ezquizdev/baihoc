"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./notice-modal.module.css";

export type NoticeTone = "info" | "success" | "error";

type NoticeModalProps = {
  open: boolean;
  title: string;
  message: string;
  tone?: NoticeTone;
  closeLabel?: string;
  onClose: () => void;
};

export function NoticeModal({
  open,
  title,
  message,
  tone = "info",
  closeLabel = "Đóng",
  onClose,
}: NoticeModalProps) {
  const titleId = useId();
  const messageId = useId();
  const primaryRef = useRef<HTMLButtonElement | null>(null);
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
  const portalRoot = typeof document === "undefined" ? null : document.body;
  if (!portalRoot) return null;

  const dialogToneClassName =
    tone === "error"
      ? styles.dialogError
      : tone === "success"
        ? styles.dialogSuccess
        : "";

  return createPortal(
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.dialog} ${dialogToneClassName}`.trim()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <button
            ref={primaryRef}
            type="button"
            className={`${styles.btn} ${
              tone === "success" ? styles.btnSuccess : ""
            }`.trim()}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
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
