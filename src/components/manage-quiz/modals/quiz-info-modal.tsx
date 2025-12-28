"use client";

import { X } from "phosphor-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DifficultyLevel,
  QuizStatus,
  QuizVisibility,
} from "@/application/models/enums";
import type { QuizDetail } from "@/application/models/quiz";
import styles from "./manage-quiz-modals.module.css";

type QuizInfoModalProps = {
  quizId: string | null;
  onClose: () => void;
  onContinue: (quizId: string) => void;
  onMutated: () => void;
};

type LocalError = string | null;

export function QuizInfoModal({
  quizId,
  onClose,
  onContinue,
  onMutated,
}: QuizInfoModalProps) {
  const titleId = "manage-quiz-info-title";
  const primaryRef = useRef<HTMLTextAreaElement | null>(null);

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<LocalError>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<QuizStatus>("draft");
  const [visibility, setVisibility] = useState<QuizVisibility>("free");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(5);
  const [minutes, setMinutes] = useState(15);
  const [isChallenge, setIsChallenge] = useState(false);
  const [challengeStart, setChallengeStart] = useState("");
  const [challengeEnd, setChallengeEnd] = useState("");

  useEffect(() => {
    if (!quizId) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuiz(null);
        const response = await fetch(`/api/staff/quizzes/${quizId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải quiz");
        }
        const payload = await response.json();
        const nextQuiz = payload.quiz as QuizDetail | undefined;
        if (!nextQuiz) {
          throw new Error("Không thể tải quiz");
        }
        setQuiz(nextQuiz);
        setTitle(nextQuiz.title ?? "");
        setDescription(nextQuiz.description ?? "");
        setStatus((nextQuiz.status ?? "draft") as QuizStatus);
        setVisibility(nextQuiz.visibility ?? "free");
        setDifficulty((nextQuiz.difficulty ?? 5) as DifficultyLevel);
        setMinutes(
          nextQuiz.estimatedTimeSeconds
            ? Math.round(nextQuiz.estimatedTimeSeconds / 60)
            : 15,
        );
        setIsChallenge(Boolean(nextQuiz.isChallenge));
        setChallengeStart(toDatetimeLocalValue(nextQuiz.challenge?.startAt));
        setChallengeEnd(toDatetimeLocalValue(nextQuiz.challenge?.endAt));
        requestAnimationFrame(() => primaryRef.current?.focus());
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không thể tải quiz");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [quizId]);

  const challengeValidation = useMemo(() => {
    if (!isChallenge) return { ok: true, message: null as string | null };
    if (!challengeStart || !challengeEnd) {
      return {
        ok: false,
        message: "Challenge cần thời gian bắt đầu và kết thúc.",
      };
    }
    const start = new Date(challengeStart).getTime();
    const end = new Date(challengeEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { ok: false, message: "Thời gian challenge không hợp lệ." };
    }
    if (start >= end) {
      return {
        ok: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
      };
    }
    return { ok: true, message: null as string | null };
  }, [challengeEnd, challengeStart, isChallenge]);

  if (!quizId) return null;

  const disabled = loading || saving;

  const submit = async (mode: "save" | "continue") => {
    if (!quizId) return;
    if (!challengeValidation.ok) {
      setError(challengeValidation.message);
      return;
    }
    setError(null);
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};

      const titleTrimmed = title.trim();
      if (titleTrimmed) payload.title = titleTrimmed;
      payload.description = description.trim() ? description.trim() : null;
      payload.status = status;
      payload.visibility = visibility;
      payload.difficulty = difficulty;
      const safeMinutes =
        Number.isFinite(minutes) && minutes > 0 ? minutes : 15;
      payload.estimatedTimeSeconds = Math.max(1, Math.round(safeMinutes)) * 60;
      payload.isChallenge = isChallenge;

      if (isChallenge) {
        const startDate = new Date(challengeStart);
        const endDate = new Date(challengeEnd);
        if (
          !Number.isFinite(startDate.getTime()) ||
          !Number.isFinite(endDate.getTime())
        ) {
          throw new Error("Thời gian challenge không hợp lệ.");
        }
        const startAt = startDate.toISOString();
        const endAt = endDate.toISOString();
        payload.challenge = {
          startAt,
          endAt,
        };
      } else {
        payload.challenge = null;
      }

      const response = await fetch(`/api/staff/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể cập nhật quiz");
      }

      onMutated();
      if (mode === "continue") {
        onContinue(quizId);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật quiz");
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
          {loading ? (
            <output aria-live="polite">Đang tải quiz...</output>
          ) : null}

          {!loading && quiz ? (
            <>
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
                <h3 id={titleId} className={styles.infoTitle}>
                  Thông tin quiz
                </h3>

                <div className={styles.formRow}>
                  <div className={styles.label}>Mô tả quiz:</div>
                  <textarea
                    className={styles.dashArea}
                    placeholder=".............................................................."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.label}>Trạng thái:</div>
                  <label className={styles.ck}>
                    <input
                      type="radio"
                      name="status"
                      checked={status === "draft"}
                      onChange={() => setStatus("draft")}
                      disabled={disabled}
                    />
                    Nháp
                  </label>
                  <label className={styles.ck}>
                    <input
                      type="radio"
                      name="status"
                      checked={status === "published"}
                      onChange={() => setStatus("published")}
                      disabled={disabled}
                    />
                    Đã đăng
                  </label>
                  <label className={styles.ck}>
                    <input
                      type="radio"
                      name="status"
                      checked={status === "archived"}
                      onChange={() => setStatus("archived")}
                      disabled={disabled}
                    />
                    Lưu trữ
                  </label>
                </div>

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
                          onChange={() =>
                            setDifficulty(level as DifficultyLevel)
                          }
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

                <div className={styles.formRow}>
                  <div className={styles.label}>Đặt làm Challenge:</div>
                  <label className={styles.ck}>
                    <input
                      type="radio"
                      name="challenge"
                      checked={isChallenge}
                      onChange={() => setIsChallenge(true)}
                      disabled={disabled}
                    />
                    Có
                  </label>
                  <label className={styles.ck}>
                    <input
                      type="radio"
                      name="challenge"
                      checked={!isChallenge}
                      onChange={() => setIsChallenge(false)}
                      disabled={disabled}
                    />
                    Không
                  </label>
                </div>

                {isChallenge ? (
                  <>
                    <div className={styles.formRow}>
                      <div className={styles.label}>Bắt đầu:</div>
                      <input
                        className={styles.dashInput}
                        type="datetime-local"
                        value={challengeStart}
                        onChange={(event) =>
                          setChallengeStart(event.target.value)
                        }
                        disabled={disabled}
                      />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.label}>Kết thúc:</div>
                      <input
                        className={styles.dashInput}
                        type="datetime-local"
                        value={challengeEnd}
                        onChange={(event) =>
                          setChallengeEnd(event.target.value)
                        }
                        disabled={disabled}
                      />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.label}>Thời gian:</div>
                      <span className={styles.hintInline}>
                        Dùng theo “Thời gian làm” của quiz.
                      </span>
                    </div>
                  </>
                ) : null}
              </div>

              {error ? (
                <div className={styles.inlineError} role="alert">
                  {error}
                </div>
              ) : null}
            </>
          ) : null}

          {!loading && !quiz && error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>

        {!loading && quiz ? (
          <div className={styles.modalActions}>
            <button
              className={`${styles.pillBtn} ${styles.pillPrimary} ${
                disabled || !challengeValidation.ok ? styles.pillDisabled : ""
              }`}
              type="button"
              disabled={disabled || !challengeValidation.ok}
              onClick={() => submit("continue")}
            >
              Tiếp tục
            </button>
            <button
              className={`${styles.pillBtn} ${styles.pillAccent} ${
                disabled || !challengeValidation.ok ? styles.pillDisabled : ""
              }`}
              type="button"
              disabled={disabled || !challengeValidation.ok}
              onClick={() => submit("save")}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
