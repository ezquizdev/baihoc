"use client";

import { X } from "phosphor-react";
import { useEffect, useRef, useState } from "react";
import type {
  DifficultyLevel,
  QuizVisibility,
} from "@/application/models/enums";
import styles from "./manage-quiz-modals.module.css";

type CreateQuizModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (quizId: string) => void;
};

type LocalError = string | null;

export function CreateQuizModal({
  open,
  onClose,
  onCreated,
}: CreateQuizModalProps) {
  const titleId = "create-quiz-title";
  const primaryRef = useRef<HTMLTextAreaElement | null>(null);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<QuizVisibility>("free");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(5);
  const [minutes, setMinutes] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<LocalError>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setVisibility("free");
    setDifficulty(5);
    setMinutes(15);
    setError(null);
    setSaving(false);
    requestAnimationFrame(() => primaryRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const disabled = saving;

  const submit = async () => {
    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      setError("Vui lòng nhập tên quiz.");
      return;
    }
    setError(null);
    try {
      setSaving(true);
      const safeMinutes =
        Number.isFinite(minutes) && minutes > 0 ? minutes : 15;
      const payload = {
        title: titleTrimmed,
        description: null,
        difficulty,
        visibility,
        estimatedTimeSeconds: Math.max(1, Math.round(safeMinutes)) * 60,
        isChallenge: false,
      };
      const response = await fetch("/api/staff/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể tạo quiz");
      }
      const data = await response.json();
      const quizId = data?.quiz?.id as string | undefined;
      if (!quizId) throw new Error("Không thể tạo quiz");
      onCreated(quizId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.dialogHead}>
          <button
            className={styles.xbtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={disabled}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className={styles.dialogBody}>
          <h3 id={titleId} className={styles.infoTitle}>
            Tạo quiz mới
          </h3>

          <textarea
            ref={primaryRef}
            className={styles.titleInput}
            rows={2}
            placeholder="Tên quiz ..."
            aria-label="Tên quiz"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={disabled}
          />

          <div className={styles.infoPanel}>
            <div className={styles.formRow}>
              <div className={styles.label}>Quyền truy cập:</div>
              <label className={styles.ck}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "free"}
                  onChange={() => setVisibility("free")}
                  disabled={disabled}
                />
                Miễn phí
              </label>
              <label className={styles.ck}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "premium"}
                  onChange={() => setVisibility("premium")}
                  disabled={disabled}
                />
                VIP
              </label>
            </div>

            <div className={styles.formRow}>
              <div className={styles.label}>Độ khó mặc định:</div>
              <div
                className={styles.diffPicks}
                role="radiogroup"
                aria-label="Độ khó"
              >
                {[5, 4, 3, 2, 1].map((level) => (
                  <label
                    key={level}
                    className={`${styles.ck} ${styles.diffOpt}`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level as DifficultyLevel)}
                      disabled={disabled}
                    />
                    <span
                      className={`${styles.chip2} ${diffChipClass(level, styles)}`}
                    >
                      {level} ★
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.label}>Thời gian làm:</div>
              <input
                className={styles.dashInput}
                type="number"
                min={1}
                max={300}
                value={minutes}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMinutes(Number.isFinite(next) ? next : 15);
                }}
                disabled={disabled}
              />
              <span>phút</span>
            </div>
          </div>

          {error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button
            className={`${styles.pillBtn} ${styles.pillDanger} ${
              disabled ? styles.pillDisabled : ""
            }`}
            type="button"
            onClick={onClose}
            disabled={disabled}
          >
            Hủy
          </button>
          <button
            className={`${styles.pillBtn} ${styles.pillPrimary} ${
              disabled ? styles.pillDisabled : ""
            }`}
            type="button"
            onClick={submit}
            disabled={disabled}
          >
            {saving ? "Đang tạo..." : "Tạo quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

function diffChipClass(level: number, moduleStyles: typeof styles) {
  switch (level) {
    case 5:
      return moduleStyles.c5;
    case 4:
      return moduleStyles.c4;
    case 3:
      return moduleStyles.c3;
    case 2:
      return moduleStyles.c2;
    default:
      return moduleStyles.c1;
  }
}
