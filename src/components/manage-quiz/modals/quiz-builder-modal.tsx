"use client";

import { X } from "phosphor-react";
import { useEffect, useMemo, useState } from "react";
import type {
  QuizDetail,
  QuizQuestionSummary,
} from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import styles from "./manage-quiz-modals.module.css";
import { QuestionBankPickerModal } from "./question-bank-picker-modal";

type QuizBuilderModalProps = {
  quizId: string | null;
  refreshKey: number;
  subjects: Subject[];
  onClose: () => void;
  onEditQuestion: (questionId: string, position: number) => void;
  onMutated: () => void;
};

export function QuizBuilderModal({
  quizId,
  refreshKey,
  subjects,
  onClose,
  onEditQuestion,
  onMutated,
}: QuizBuilderModalProps) {
  const titleId = "manage-quiz-builder-title";
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    void refreshKey;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/staff/quizzes/${quizId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải quiz");
        }
        const payload = await response.json();
        const nextQuiz = payload.quiz as QuizDetail | undefined;
        if (!nextQuiz) throw new Error("Không thể tải quiz");
        setQuiz(nextQuiz);
        setDescription(nextQuiz.description ?? "");
        setQuestions(
          [...(nextQuiz.questions ?? [])].sort(
            (a, b) => a.position - b.position,
          ),
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không thể tải quiz");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [quizId, refreshKey]);

  const visibilityText = quiz?.visibility === "premium" ? "VIP" : "Miễn phí";
  const difficultyText = quiz ? `${quiz.difficulty}★` : "—";
  const minutesText = quiz?.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : "—";
  const challengeText = quiz?.isChallenge ? "Có" : "Không";

  const saveQuestions = async () => {
    if (!quizId) return;
    const payload = {
      questions: questions.map((q, idx) => ({
        questionId: q.id,
        position: idx + 1,
        score: q.score,
        required: q.required,
      })),
    };
    const response = await fetch(`/api/staff/quizzes/${quizId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Không thể cập nhật danh sách câu hỏi");
    }
  };

  const saveMeta = async (status?: "draft") => {
    if (!quizId) return;
    const payload: Record<string, unknown> = {
      description: description.trim() ? description.trim() : null,
    };
    if (status) payload.status = status;
    const response = await fetch(`/api/staff/quizzes/${quizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Không thể cập nhật quiz");
    }
  };

  const publish = async () => {
    if (!quizId) return;
    const response = await fetch(`/api/staff/quizzes/${quizId}/publish`, {
      method: "POST",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Không thể xuất bản quiz");
    }
  };

  const doSave = async (mode: "draft" | "publish") => {
    if (!quizId) return;
    setError(null);
    try {
      setSaving(true);
      await saveQuestions();
      if (mode === "draft") {
        await saveMeta("draft");
      } else {
        await saveMeta();
        await publish();
      }
      onMutated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu quiz");
    } finally {
      setSaving(false);
    }
  };

  const toolDisabled = useMemo(() => loading || saving, [loading, saving]);

  if (!quizId) return null;

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.dialog} ${styles.dialogLarge}`}
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
            disabled={toolDisabled}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className={styles.builderScroll}>
          {loading ? (
            <output aria-live="polite">Đang tải quiz...</output>
          ) : null}

          {!loading && quiz ? (
            <>
              <div className={styles.builderHead}>
                <h2 id={titleId} className={styles.builderHeadTitle}>
                  {quiz.title}
                </h2>
              </div>

              <div className={styles.builderDesc}>
                <label htmlFor="builder-desc">Mô tả quiz ở đây:</label>
                <textarea
                  id="builder-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder=".............................................................."
                  disabled={toolDisabled}
                />
              </div>

              <div className={styles.builderInfoBar}>
                <div className={styles.infoItem}>
                  Quyền truy cập: <b>{visibilityText}</b>
                </div>
                <div className={styles.infoItem}>
                  Độ khó mặc định:{" "}
                  <span className={styles.miniDiff}>{difficultyText}</span>
                </div>
                <div className={styles.infoItem}>
                  Thời gian làm:{" "}
                  <b>
                    <span>{minutesText}</span> phút
                  </b>
                </div>
                <div className={styles.infoItem}>
                  Đặt làm Challenge: <b>{challengeText}</b>
                </div>
              </div>

              <div className={styles.builderTools}>
                <button
                  className={`${styles.toolBtn} ${styles.toolBlue}`}
                  type="button"
                  onClick={() => setBankOpen(true)}
                  disabled={toolDisabled}
                >
                  Chọn câu hỏi từ kho
                </button>
                <button
                  className={`${styles.toolBtn} ${styles.toolYellow}`}
                  type="button"
                  onClick={() => window.open("/staff/questions/new", "_blank")}
                  disabled={toolDisabled}
                >
                  Tạo câu hỏi mới
                </button>
                <button
                  className={`${styles.toolBtn} ${styles.toolDark}`}
                  type="button"
                  onClick={() =>
                    window.alert("Chưa hỗ trợ: import quiz từ file")
                  }
                  disabled={toolDisabled}
                >
                  Tải quiz từ file
                </button>
              </div>

              <div className={styles.builderSection}>Câu hỏi</div>

              <div className={styles.qList}>
                {questions.map((q, idx) => (
                  <div key={q.id} className={styles.qCard} data-qid={q.id}>
                    <div className={styles.qTitle}>{`Câu ${idx + 1}:`}</div>
                    <p className={styles.qText}>{q.stem}</p>
                    <div className={styles.qMetaRow}>
                      <label className={styles.qMetaItem}>
                        <span>Điểm</span>
                        <input
                          className={styles.qScoreInput}
                          type="number"
                          min={1}
                          placeholder={String(q.defaultScore)}
                          value={q.score ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? {
                                      ...item,
                                      score: raw ? Number(raw) : null,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          disabled={toolDisabled}
                        />
                        <span className={styles.qMetaHint}>
                          mặc định: {q.defaultScore}
                        </span>
                      </label>

                      <label className={styles.qMetaToggle}>
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={() => {
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id
                                  ? { ...item, required: !item.required }
                                  : item,
                              ),
                            );
                          }}
                          disabled={toolDisabled}
                        />
                        Bắt buộc
                      </label>

                      <div className={styles.qMove}>
                        <button
                          type="button"
                          className={`${styles.smallBtn} ${styles.smallGray}`}
                          onClick={() => {
                            if (idx === 0) return;
                            setQuestions((prev) => {
                              const next = [...prev];
                              const tmp = next[idx - 1];
                              next[idx - 1] = next[idx];
                              next[idx] = tmp;
                              return next;
                            });
                          }}
                          disabled={toolDisabled || idx === 0}
                          aria-label="Đưa lên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={`${styles.smallBtn} ${styles.smallGray}`}
                          onClick={() => {
                            if (idx >= questions.length - 1) return;
                            setQuestions((prev) => {
                              const next = [...prev];
                              const tmp = next[idx + 1];
                              next[idx + 1] = next[idx];
                              next[idx] = tmp;
                              return next;
                            });
                          }}
                          disabled={toolDisabled || idx >= questions.length - 1}
                          aria-label="Đưa xuống"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <div className={styles.qActions}>
                      <button
                        className={`${styles.smallBtn} ${styles.smallBlue}`}
                        type="button"
                        onClick={() => onEditQuestion(q.id, idx + 1)}
                        disabled={toolDisabled}
                      >
                        Sửa
                      </button>
                      <button
                        className={`${styles.smallBtn} ${styles.smallRed}`}
                        type="button"
                        onClick={() => {
                          const ok = window.confirm(
                            "Xóa câu hỏi này khỏi quiz?",
                          );
                          if (!ok) return;
                          setQuestions((prev) =>
                            prev.filter((item) => item.id !== q.id),
                          );
                        }}
                        disabled={toolDisabled}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {error ? (
                <div className={styles.inlineError} role="alert">
                  {error}
                </div>
              ) : null}

              <div className={styles.builderFooter}>
                <button
                  className={`${styles.pillBtn} ${styles.pillDanger} ${
                    toolDisabled ? styles.pillDisabled : ""
                  }`}
                  type="button"
                  onClick={onClose}
                  disabled={toolDisabled}
                >
                  Hủy
                </button>
                <button
                  className={`${styles.pillBtn} ${styles.pillPrimary} ${
                    toolDisabled ? styles.pillDisabled : ""
                  }`}
                  type="button"
                  onClick={() => doSave("draft")}
                  disabled={toolDisabled}
                >
                  {saving ? "Đang lưu..." : "Lưu nháp"}
                </button>
                <button
                  className={`${styles.pillBtn} ${styles.pillAccent} ${
                    toolDisabled ? styles.pillDisabled : ""
                  }`}
                  type="button"
                  onClick={() => doSave("publish")}
                  disabled={toolDisabled}
                >
                  {saving ? "Đang đăng..." : "Đăng"}
                </button>
              </div>
            </>
          ) : null}

          {!loading && !quiz && error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <QuestionBankPickerModal
        open={bankOpen}
        subjects={subjects}
        existingQuestionIds={questions.map((q) => q.id)}
        onClose={() => setBankOpen(false)}
        onAdd={(selected) => {
          setQuestions((prev) => {
            const existing = new Set(prev.map((q) => q.id));
            const additions = selected
              .filter((q) => !existing.has(q.id))
              .map((q, idx) => ({
                id: q.id,
                stem: q.stem,
                type: q.type,
                defaultScore: q.defaultScore,
                position: prev.length + idx + 1,
                score: null,
                required: true,
              }));
            return [...prev, ...additions];
          });
          setBankOpen(false);
        }}
      />
    </div>
  );
}
