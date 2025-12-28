"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuizDetail } from "@/application/models/quiz";
import type { StaffHighlightChallengeSettingsDto } from "@/application/models/staffSettings";
import styles from "./highlight-challenge-settings-card.module.css";

type Notice = { tone: "success" | "error"; message: string };

type EligibleQuestion = { id: string; label: string; type: string };

export function HighlightChallengeSettingsCard({
  initial,
}: {
  initial: StaffHighlightChallengeSettingsDto;
}) {
  const [config, setConfig] = useState(initial.config);
  const [activeChallenges, setActiveChallenges] = useState(
    initial.activeChallenges,
  );

  const defaultQuizId = config?.isActive ? config.quizId : null;
  const defaultQuestionId = config?.isActive ? config.questionId : null;

  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    defaultQuizId ?? "",
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    defaultQuestionId ?? "",
  );

  const [questions, setQuestions] = useState<EligibleQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const canSave = Boolean(selectedQuizId && selectedQuestionId);

  const selectedQuizLabel = useMemo(() => {
    const match = activeChallenges.find((c) => c.quizId === selectedQuizId);
    if (!match) return "Chọn challenge...";
    return match.quizTitle ? match.quizTitle : `Challenge ${match.quizId}`;
  }, [activeChallenges, selectedQuizId]);

  const refresh = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/staff/settings/highlight-challenge");
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể tải cấu hình");
      }
      const payload = (await res.json()) as StaffHighlightChallengeSettingsDto;
      setConfig(payload.config);
      setActiveChallenges(payload.activeChallenges ?? []);
    } catch (err) {
      setNotice({
        tone: "error",
        message: err instanceof Error ? err.message : "Không thể tải cấu hình",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedQuizId) {
      setQuestions([]);
      setSelectedQuestionId("");
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setLoadingQuestions(true);
      try {
        const res = await fetch(`/api/staff/quizzes/${selectedQuizId}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải danh sách câu hỏi");
        }
        const payload = (await res.json()) as { quiz?: QuizDetail };
        const quiz = payload.quiz;
        const eligible = (quiz?.questions ?? [])
          .filter((q) => q.type === "mcq_single" || q.type === "mcq_multi")
          .map((q) => ({
            id: q.id,
            type: q.type,
            label: toSelectLabel(q.stem, q.position, q.type),
          }));
        setQuestions(eligible);
        setSelectedQuestionId((prev) => {
          if (eligible.some((q) => q.id === prev)) return prev;
          return "";
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setNotice({
          tone: "error",
          message: err instanceof Error ? err.message : "Không thể tải câu hỏi",
        });
        setQuestions([]);
        setSelectedQuestionId("");
      } finally {
        setLoadingQuestions(false);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedQuizId]);

  const save = async () => {
    if (!canSave) return;
    setMutating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/staff/settings/highlight-challenge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: selectedQuizId,
          questionId: selectedQuestionId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể cập nhật cấu hình");
      }
      setNotice({
        tone: "success",
        message: "Đã cập nhật highlight challenge.",
      });
      await refresh();
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Không thể cập nhật cấu hình",
      });
    } finally {
      setMutating(false);
    }
  };

  const clear = async () => {
    setMutating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/staff/settings/highlight-challenge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: null, questionId: null }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xóa cấu hình");
      }
      setNotice({ tone: "success", message: "Đã xóa highlight challenge." });
      setSelectedQuizId("");
      setSelectedQuestionId("");
      setQuestions([]);
      await refresh();
    } catch (err) {
      setNotice({
        tone: "error",
        message: err instanceof Error ? err.message : "Không thể xóa cấu hình",
      });
    } finally {
      setMutating(false);
    }
  };

  const busy = loading || mutating;

  return (
    <div className={styles.wrap} aria-busy={busy}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Highlight challenge</h2>
          <p className={styles.subtitle}>
            Chọn một challenge <b>đang diễn ra</b> và một câu hỏi để hiển thị
            trên dashboard của học sinh.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => void refresh()}
          disabled={busy}
        >
          Làm mới
        </button>
      </div>

      {notice ? (
        <div
          className={`${styles.notice} ${
            notice.tone === "success"
              ? styles.noticeSuccess
              : styles.noticeError
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}

      <div className={styles.current}>
        <div className={styles.currentLabel}>Đang cấu hình:</div>
        {config ? (
          <div className={styles.currentValue}>
            <div className={styles.currentMain}>
              <span className={styles.pill}>
                {config.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <span className={styles.currentText}>
                {config.quizTitle ?? config.quizId} ·{" "}
                {config.questionStem
                  ? toInlinePreview(config.questionStem)
                  : config.questionId}
              </span>
            </div>
            {config.endAt ? (
              <div className={styles.currentMeta}>
                Kết thúc: {formatDateTimeVi(config.endAt)}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.currentValue}>
            <span className={styles.muted}>Chưa cấu hình.</span>
          </div>
        )}
      </div>

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Challenge đang diễn ra</span>
          <select
            className={styles.select}
            value={selectedQuizId}
            onChange={(event) => setSelectedQuizId(event.target.value)}
            disabled={busy}
          >
            <option value="">{selectedQuizLabel}</option>
            {activeChallenges.map((c) => (
              <option key={c.quizId} value={c.quizId}>
                {c.quizTitle ?? c.quizId} (đến {formatDateTimeVi(c.endAt)})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Câu hỏi</span>
          <select
            className={styles.select}
            value={selectedQuestionId}
            onChange={(event) => setSelectedQuestionId(event.target.value)}
            disabled={busy || !selectedQuizId || loadingQuestions}
          >
            <option value="">
              {loadingQuestions
                ? "Đang tải câu hỏi..."
                : selectedQuizId
                  ? questions.length
                    ? "Chọn câu hỏi..."
                    : "Challenge này chưa có câu hỏi trắc nghiệm phù hợp."
                  : "Chọn challenge trước"}
            </option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${
              busy || !canSave ? styles.btnDisabled : ""
            }`}
            disabled={busy || !canSave}
            onClick={() => void save()}
          >
            {mutating ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary} ${
              busy || !config ? styles.btnDisabled : ""
            }`}
            disabled={busy || !config}
            onClick={() => void clear()}
          >
            Xóa cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}

function toInlinePreview(value: string) {
  return value.trim().replaceAll(/\s+/g, " ").slice(0, 120);
}

function toSelectLabel(stem: string, position: number, type: string) {
  const shortType = type === "mcq_multi" ? "multi" : "single";
  const preview = toInlinePreview(stem);
  return `#${position} (${shortType}) ${preview}`;
}

function formatDateTimeVi(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
