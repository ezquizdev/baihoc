"use client";

import { X } from "phosphor-react";
import { useEffect, useMemo, useState } from "react";
import type { QuestionDetail } from "@/application/models/question";
import styles from "./manage-quiz-modals.module.css";

type QuestionEditTarget = {
  quizId: string;
  questionId: string;
  position: number;
};

type QuestionEditModalProps = {
  target: QuestionEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
};

type OptionDraft = {
  label: string | null;
  text: string;
  isCorrect: boolean;
  position: number;
};

export function QuestionEditModal({
  target,
  onClose,
  onSaved,
}: QuestionEditModalProps) {
  const titleId = "manage-quiz-question-title";
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetail(null);
        const response = await fetch(
          `/api/staff/questions/${target.questionId}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không tìm thấy câu hỏi");
        }
        const payload = await response.json();
        const next = payload.question as QuestionDetail | undefined;
        if (!next) throw new Error("Không tìm thấy câu hỏi");
        setDetail(next);
        const baseOptions = [...(next.options ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((o) => ({
            label: o.label ?? null,
            text: o.text,
            isCorrect: o.isCorrect,
            position: o.position,
          }));
        const type = next.question.type;
        const isMcq = type === "mcq_single" || type === "mcq_multi";
        setOptions(
          isMcq && baseOptions.length === 0
            ? buildDefaultMcqOptions()
            : baseOptions,
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không tìm thấy câu hỏi");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [target]);

  const questionType = detail?.question.type;
  const isMcq = questionType === "mcq_single" || questionType === "mcq_multi";
  const isMultiCorrect = questionType === "mcq_multi";

  const canSave = useMemo(() => {
    if (!isMcq) return false;
    if (!options.length) return false;
    const hasEmpty = options.some((o) => !o.text.trim());
    if (hasEmpty) return false;
    if (!options.some((o) => o.isCorrect)) return false;
    if (!isMultiCorrect && options.filter((o) => o.isCorrect).length !== 1)
      return false;
    return true;
  }, [isMcq, isMultiCorrect, options]);

  if (!target) return null;

  const disabled = loading || saving;

  const save = async () => {
    if (!target) return;
    if (!canSave) {
      setError("Vui lòng chọn đáp án và điền đầy đủ nội dung.");
      return;
    }
    setError(null);
    try {
      setSaving(true);
      const payload = {
        options: options
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((o) => ({
            label: o.label ?? null,
            text: o.text.trim(),
            isCorrect: o.isCorrect,
            position: o.position,
          })),
      };
      const response = await fetch(
        `/api/staff/questions/${target.questionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể cập nhật câu hỏi");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật câu hỏi",
      );
    } finally {
      setSaving(false);
    }
  };

  const pickCorrect = (index: number) => {
    setOptions((prev) => {
      if (isMultiCorrect) {
        return prev.map((opt, idx) =>
          idx === index ? { ...opt, isCorrect: !opt.isCorrect } : opt,
        );
      }
      return prev.map((opt, idx) => ({ ...opt, isCorrect: idx === index }));
    });
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
          {loading ? (
            <output aria-live="polite">Đang tải câu hỏi...</output>
          ) : null}

          {!loading && detail ? (
            <>
              <div id={titleId} className={styles.qeditTitle}>
                {`Câu ${target.position}:`}
              </div>
              <p className={styles.qeditText}>{detail.question.stem}</p>

              {!isMcq ? (
                <div className={styles.inlineError} role="alert">
                  Hiện chỉ hỗ trợ chỉnh sửa câu hỏi trắc nghiệm (MCQ).
                </div>
              ) : (
                <div>
                  {options.map((opt, idx) => (
                    <div key={opt.position} className={styles.ansRow}>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(event) => {
                          const nextText = event.target.value;
                          setOptions((prev) =>
                            prev.map((o, oi) =>
                              oi === idx ? { ...o, text: nextText } : o,
                            ),
                          );
                        }}
                        disabled={disabled}
                      />
                      <button
                        type="button"
                        className={`${styles.pick} ${
                          opt.isCorrect ? styles.pickActive : ""
                        }`}
                        onClick={() => pickCorrect(idx)}
                        aria-label="Chọn đáp án đúng"
                        disabled={disabled}
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error ? (
                <div className={styles.inlineError} role="alert">
                  {error}
                </div>
              ) : null}
            </>
          ) : null}

          {!loading && !detail && error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>

        {!loading && detail ? (
          <div className={styles.qeditFooter}>
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
              className={`${styles.pillBtn} ${styles.pillAccent} ${
                disabled ? styles.pillDisabled : ""
              }`}
              type="button"
              onClick={() => window.alert("Chưa hỗ trợ: xem trước câu hỏi")}
              disabled={disabled}
            >
              Xem trước
            </button>
            <button
              className={`${styles.pillBtn} ${styles.pillPrimary} ${
                disabled || !canSave ? styles.pillDisabled : ""
              }`}
              type="button"
              onClick={save}
              disabled={disabled || !canSave}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildDefaultMcqOptions(): OptionDraft[] {
  return [
    { label: null, text: "", isCorrect: false, position: 1 },
    { label: null, text: "", isCorrect: false, position: 2 },
    { label: null, text: "", isCorrect: false, position: 3 },
    { label: null, text: "", isCorrect: false, position: 4 },
  ];
}
