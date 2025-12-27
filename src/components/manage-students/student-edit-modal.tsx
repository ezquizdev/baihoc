"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { UserAdminDetail } from "@/application/models/userAdmin";
import styles from "./student-edit-modal.module.css";

type StudentEditModalProps = {
  open: boolean;
  user: UserAdminDetail | null;
  onClose: () => void;
  onSaved: (user: UserAdminDetail) => void;
};

export function StudentEditModal({
  open,
  user,
  onClose,
  onSaved,
}: StudentEditModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [tier, setTier] = useState<UserAdminDetail["tier"]>("free");
  const [status, setStatus] = useState<UserAdminDetail["status"]>("active");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setTier(user.tier);
    setStatus(user.status);
    setReason("");
    setError(null);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
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

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const isInside = active ? dialog.contains(active) : false;

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!isInside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  const submit = async () => {
    if (!user) return;
    setError(null);

    const payload: Record<string, unknown> = {};
    if (tier !== user.tier) payload.tier = tier;
    if (status !== user.status) payload.status = status;
    if (reason.trim()) payload.reason = reason.trim();

    if (!payload.tier && !payload.status) {
      setError("Không có thay đổi để lưu.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/staff/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Không thể cập nhật học sinh");
      }
      const body = await response.json();
      const updated = body?.user as UserAdminDetail | undefined;
      if (!updated) {
        throw new Error("Phản hồi không hợp lệ");
      }
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật học sinh",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            Cập nhật học sinh
          </h2>
          <button type="button" className={styles.xbtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Email</span>
            <span className={styles.metaValue}>{user.email}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>User ID</span>
            <span className={styles.metaValue}>{user.id}</span>
          </div>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>Gói</span>
            <select
              className={styles.select}
              value={tier}
              onChange={(event) =>
                setTier(event.target.value as UserAdminDetail["tier"])
              }
            >
              <option value="free">Miễn phí</option>
              <option value="paid">Trả phí</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Trạng thái</span>
            <select
              className={styles.select}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as UserAdminDetail["status"])
              }
            >
              <option value="active">Hoạt động</option>
              <option value="pending_verification">Chờ xác minh</option>
              <option value="deactivated">Vô hiệu hóa</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Lý do (tuỳ chọn)</span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="VD: Gia hạn gói / khóa tài khoản / ..."
            />
          </label>

          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <div className={styles.actions}>
            <button
              ref={primaryRef}
              type="submit"
              className={styles.primary}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
          </div>
        </form>
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
