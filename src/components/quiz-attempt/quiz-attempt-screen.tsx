"use client";

import { useRouter } from "next/navigation";
import { Clock } from "phosphor-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AttemptQuestion,
  AttemptStateResponse,
} from "@/application/models/attempt";
import { Input } from "@/components/ui/input";
import styles from "./quiz-attempt.module.css";

type AnswerDraft = {
  selectedOptionIds: string[] | null;
  textAnswer: string | null;
};

type QuizAttemptScreenProps = {
  attemptId: string;
  quizTitle: string;
  initialState: AttemptStateResponse;
};

export function QuizAttemptScreen({
  attemptId,
  quizTitle,
  initialState,
}: QuizAttemptScreenProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(initialState.attempt);
  const questions = initialState.questions;
  const isTimed = attempt.timeLimitSeconds !== null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialDrafts = useMemo(() => {
    const drafts: Record<string, AnswerDraft> = {};
    questions.forEach((question) => {
      drafts[question.id] = { selectedOptionIds: null, textAnswer: null };
    });
    initialState.answers.forEach((answer) => {
      drafts[answer.questionId] = {
        selectedOptionIds: answer.selectedOptionIds ?? null,
        textAnswer: answer.textAnswer ?? null,
      };
    });
    return drafts;
  }, [initialState.answers, questions]);

  const [drafts, setDrafts] =
    useState<Record<string, AnswerDraft>>(initialDrafts);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!isTimed) return 0;
    if (attempt.remainingSeconds !== null) return attempt.remainingSeconds;
    return attempt.timeLimitSeconds ?? 0;
  });
  const remainingRef = useRef(remainingSeconds);
  useEffect(() => {
    remainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  const autoSubmitTriggeredRef = useRef(false);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const saveQueueRef = useRef(
    new Map<string, { inFlight: boolean; queued: AnswerDraft | null }>(),
  );

  const shortDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (!shortDebounceRef.current) return;
      window.clearTimeout(shortDebounceRef.current);
      shortDebounceRef.current = null;
    };
  }, []);

  const submitAttempt = useCallback(
    async (params: { auto: boolean }) => {
      if (attempt.status !== "in_progress") {
        setShowConfirmModal(false);
        setShowSuccessModal(true);
        return;
      }

      if (submitting) return;
      setSubmitting(true);
      setSubmitError(null);
      setShowConfirmModal(false);

      try {
        const answers = buildSubmitPayload(questions, draftsRef.current);
        const response = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            answers,
            ...(isTimed ? { remainingSeconds: remainingRef.current } : {}),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const code = String(payload?.code ?? "");
          const message = String(payload?.error ?? "Không thể nộp bài");
          if (response.status === 409 && code === "ATTEMPT_ALREADY_SUBMITTED") {
            setShowSuccessModal(true);
            return;
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as { attempt?: typeof attempt };
        if (payload?.attempt) {
          setAttempt(payload.attempt);
        }
        setShowSuccessModal(true);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Không thể nộp bài",
        );
        if (!params.auto) setShowConfirmModal(true);
      } finally {
        setSubmitting(false);
      }
    },
    [attempt.status, attemptId, isTimed, questions, submitting],
  );

  useEffect(() => {
    if (attempt.status === "in_progress") return;
    setShowConfirmModal(false);
    setShowSuccessModal(true);
  }, [attempt.status]);

  const syncTimer = useCallback(async () => {
    if (!isTimed) return;
    if (attempt.status !== "in_progress") return;
    try {
      await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          remainingSeconds: remainingRef.current,
        }),
      });
    } catch {
      // Ignore timer sync failures; next autosave will retry.
    }
  }, [attempt.status, attemptId, isTimed]);

  const autosaveAnswer = useCallback(
    async (question: AttemptQuestion, draft: AnswerDraft) => {
      if (attempt.status !== "in_progress") return;
      setSaveError(null);
      const queue = saveQueueRef.current;
      const state = queue.get(question.id) ?? { inFlight: false, queued: null };
      if (state.inFlight) {
        state.queued = draft;
        queue.set(question.id, state);
        return;
      }
      state.inFlight = true;
      state.queued = null;
      queue.set(question.id, state);
      setSavingCount((prev) => prev + 1);

      let didFail = false;
      try {
        let nextDraft: AnswerDraft | null = draft;
        while (nextDraft) {
          const payloadAnswer = buildAnswerPayload(question, nextDraft);
          const response = await fetch(`/api/attempts/${attemptId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              answers: [payloadAnswer],
              ...(isTimed ? { remainingSeconds: remainingRef.current } : {}),
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const code = String(payload?.code ?? "");
            const message = String(
              payload?.error ?? "Không thể lưu câu trả lời",
            );
            if (response.status === 409 && code === "ATTEMPT_EXPIRED") {
              autoSubmitTriggeredRef.current = true;
              await submitAttempt({ auto: true });
              return;
            }
            if (
              response.status === 409 &&
              code === "ATTEMPT_ALREADY_SUBMITTED"
            ) {
              setShowConfirmModal(false);
              setShowSuccessModal(true);
              return;
            }
            throw new Error(message);
          }

          const payload = (await response.json()) as {
            attempt?: typeof attempt;
          };
          if (payload?.attempt) {
            setAttempt(payload.attempt);
            if (isTimed && payload.attempt.remainingSeconds !== null) {
              setRemainingSeconds(payload.attempt.remainingSeconds);
            }
          }

          const latest = queue.get(question.id);
          nextDraft = latest?.queued ?? null;
          if (latest) {
            latest.queued = null;
            queue.set(question.id, latest);
          }
        }
      } catch (error) {
        didFail = true;
        setSaveError(error instanceof Error ? error.message : "Không thể lưu");
      } finally {
        setSavingCount((prev) => Math.max(0, prev - 1));
        const latest = queue.get(question.id) ?? state;
        const queuedDraft = latest.queued;
        latest.inFlight = false;
        latest.queued = null;
        queue.set(question.id, latest);

        if (!didFail && queuedDraft) {
          void autosaveAnswer(question, queuedDraft);
        }
      }
    },
    [attempt.status, attemptId, isTimed, submitAttempt],
  );

  const storageKey = `baihoc_attempt_flags_${attemptId}`;
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const flagsHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setFlagged(new Set());
      } else {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setFlagged(new Set(parsed.filter((id) => typeof id === "string")));
        } else {
          setFlagged(new Set());
        }
      }
    } catch {
      setFlagged(new Set());
    } finally {
      flagsHydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!flagsHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(flagged)),
      );
    } catch {
      // Ignore persistence failures (e.g. private browsing).
    }
  }, [flagged, storageKey]);

  useEffect(() => {
    if (!isTimed) return;
    if (attempt.status !== "in_progress") return;
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [attempt.status, isTimed]);

  useEffect(() => {
    if (!isTimed) return;
    if (attempt.status !== "in_progress") return;
    const id = window.setInterval(() => {
      void syncTimer();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [attempt.status, isTimed, syncTimer]);

  useEffect(() => {
    if (!isTimed) return;
    if (attempt.status !== "in_progress") return;
    if (remainingSeconds > 0) return;
    if (autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    void submitAttempt({ auto: true });
  }, [attempt.status, isTimed, remainingSeconds, submitAttempt]);

  const startedAtMs = useMemo(
    () => new Date(attempt.startedAt).getTime(),
    [attempt.startedAt],
  );
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isTimed) return;
    const id = window.setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, [isTimed]);
  void tick;

  const activeQuestion = questions[activeIndex];
  const activeDraft = activeQuestion ? drafts[activeQuestion.id] : undefined;

  const answeredCount = useMemo(() => {
    return questions.reduce((count, question) => {
      const draft = drafts[question.id];
      if (!draft) return count;
      if (question.type === "short_answer") {
        return draft.textAnswer?.trim() ? count + 1 : count;
      }
      return draft.selectedOptionIds?.length ? count + 1 : count;
    }, 0);
  }, [drafts, questions]);

  const progressPercent = questions.length
    ? Math.round(((activeIndex + 1) / questions.length) * 100)
    : 0;

  const timerText = isTimed
    ? formatClock(remainingSeconds)
    : formatClock(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));

  if (!activeQuestion) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.headerBar}>
          <div className={styles.timer}>
            <Clock size={16} weight="bold" />
            <span className={styles.timerValue}>{timerText}</span>
          </div>
          <div className={styles.title}>{quizTitle}</div>
          <div className={styles.rightMeta} />
        </div>

        <div className={styles.mainCard} role="alert">
          Không có câu hỏi để hiển thị.
        </div>
      </div>
    );
  }

  const isFlagged = flagged.has(activeQuestion.id);

  const handleJump = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(questions.length - 1, index)));
  };

  const handleNext = () => {
    if (attempt.status !== "in_progress") {
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      return;
    }
    if (activeIndex >= questions.length - 1) {
      setShowConfirmModal(true);
      return;
    }
    setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const toggleFlag = () => {
    if (attempt.status !== "in_progress") return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(activeQuestion.id)) next.delete(activeQuestion.id);
      else next.add(activeQuestion.id);
      return next;
    });
  };

  const handleSelectSingle = async (optionId: string) => {
    if (attempt.status !== "in_progress") return;
    const next = {
      selectedOptionIds: [optionId],
      textAnswer: null,
    } satisfies AnswerDraft;
    setDrafts((prev) => ({ ...prev, [activeQuestion.id]: next }));
    await autosaveAnswer(activeQuestion, next);
  };

  const handleToggleMulti = async (optionId: string) => {
    if (attempt.status !== "in_progress") return;
    const current = drafts[activeQuestion.id]?.selectedOptionIds ?? [];
    const exists = current.includes(optionId);
    const nextIds = exists
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    const next = {
      selectedOptionIds: nextIds.length ? nextIds : null,
      textAnswer: null,
    } satisfies AnswerDraft;
    setDrafts((prev) => ({ ...prev, [activeQuestion.id]: next }));
    await autosaveAnswer(activeQuestion, next);
  };

  const scheduleShortAnswerSave = (
    question: AttemptQuestion,
    value: string,
  ) => {
    if (attempt.status !== "in_progress") return;
    if (shortDebounceRef.current) {
      window.clearTimeout(shortDebounceRef.current);
      shortDebounceRef.current = null;
    }
    shortDebounceRef.current = window.setTimeout(() => {
      shortDebounceRef.current = null;
      void autosaveAnswer(question, {
        selectedOptionIds: null,
        textAnswer: value,
      });
    }, 600);
  };

  const flushShortAnswerSave = async (question: AttemptQuestion) => {
    if (shortDebounceRef.current) {
      window.clearTimeout(shortDebounceRef.current);
      shortDebounceRef.current = null;
    }
    const value = drafts[question.id]?.textAnswer ?? "";
    await autosaveAnswer(question, {
      selectedOptionIds: null,
      textAnswer: value,
    });
  };

  const renderAnswerArea = () => {
    if (activeQuestion.type === "short_answer") {
      const value = activeDraft?.textAnswer ?? "";
      return (
        <div className={styles.shortAnswerRow}>
          <Input
            value={value}
            placeholder="Nhập đáp án ở đây"
            onChange={(event) => {
              const nextValue = event.target.value;
              setDrafts((prev) => ({
                ...prev,
                [activeQuestion.id]: {
                  selectedOptionIds: null,
                  textAnswer: nextValue,
                },
              }));
              scheduleShortAnswerSave(activeQuestion, nextValue);
            }}
            onBlur={() => {
              void flushShortAnswerSave(activeQuestion);
            }}
            disabled={attempt.status !== "in_progress" || submitting}
          />
        </div>
      );
    }

    const selected = new Set(activeDraft?.selectedOptionIds ?? []);
    return (
      <div className={styles.optionsGrid}>
        {activeQuestion.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          const className = [
            styles.optionButton,
            isSelected ? styles.optionSelected : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={opt.id}
              type="button"
              className={className}
              onClick={() => {
                void (activeQuestion.type === "mcq_multi"
                  ? handleToggleMulti(opt.id)
                  : handleSelectSingle(opt.id));
              }}
              disabled={attempt.status !== "in_progress" || submitting}
            >
              {opt.label ? `${opt.label}. ` : ""}
              {opt.text}
            </button>
          );
        })}
      </div>
    );
  };

  const canSubmit = attempt.status === "in_progress" && !submitting;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerBar}>
        <div className={styles.timer}>
          <Clock size={16} weight="bold" />
          <span className={styles.timerLabel}>
            {isTimed ? "Còn lại" : "Đã làm"}
          </span>
          <span className={styles.timerValue}>{timerText}</span>
        </div>

        <div className={styles.title}>{quizTitle}</div>

        <div className={styles.rightMeta}>
          {savingCount > 0 ? (
            <span className={styles.savingPill}>Đang lưu...</span>
          ) : null}
          {saveError ? (
            <span className={styles.errorPill}>{saveError}</span>
          ) : null}
          {submitError ? (
            <span className={styles.errorPill}>{submitError}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.mainCard} aria-label="Câu hỏi">
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {activeQuestion.passage ? (
            <div className={styles.passage}>
              <div className={styles.passageTitle}>Đoạn văn</div>
              <div className={styles.passageContent}>
                {activeQuestion.passage.content}
              </div>
            </div>
          ) : null}

          <div className={styles.questionHeading}>
            Câu {activeQuestion.position}:
          </div>
          <div className={styles.stem}>{activeQuestion.stem}</div>

          {activeQuestion.type === "mcq_multi" &&
          activeQuestion.options.length ? (
            <div className={styles.timerLabel}>
              Chọn {">"} 1 đáp án nếu phù hợp.
            </div>
          ) : null}

          {renderAnswerArea()}

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionSubmit}`}
              onClick={() => {
                setSubmitError(null);
                setShowConfirmModal(true);
              }}
              disabled={!canSubmit}
            >
              Nộp bài
            </button>

            <button
              type="button"
              className={[
                styles.actionButton,
                styles.actionFlag,
                isFlagged ? styles.actionFlagActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={toggleFlag}
              disabled={attempt.status !== "in_progress" || submitting}
            >
              Đánh dấu
            </button>

            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionNext}`}
              onClick={handleNext}
              disabled={attempt.status !== "in_progress" || submitting}
            >
              Câu tiếp
            </button>
          </div>
        </section>

        <aside className={styles.navigator} aria-label="Bảng câu hỏi">
          <div className={styles.navTitle}>Câu hỏi</div>
          <div className={styles.navGrid}>
            {questions.map((question, index) => {
              const draft = drafts[question.id];
              const isAnswered =
                question.type === "short_answer"
                  ? Boolean(draft?.textAnswer?.trim())
                  : Boolean(draft?.selectedOptionIds?.length);
              const isActive = index === activeIndex;
              const className = [
                styles.navItem,
                isAnswered ? styles.navItemAnswered : "",
                isActive ? styles.navItemActive : "",
                flagged.has(question.id) ? styles.navItemFlagged : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={question.id}
                  type="button"
                  className={className}
                  onClick={() => handleJump(index)}
                  disabled={attempt.status !== "in_progress" || submitting}
                  aria-label={buildNavigatorLabel({
                    position: question.position,
                    answered: isAnswered,
                    flagged: flagged.has(question.id),
                    active: isActive,
                  })}
                  aria-current={isActive ? "true" : undefined}
                >
                  {question.position}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <AttemptModal
        open={showConfirmModal}
        title="Bạn có chắc chắn muốn nộp bài?"
        subtitle={`Bạn đã điền đáp án ${answeredCount}/${questions.length} câu`}
        primaryLabel={submitting ? "Đang nộp..." : "Nộp bài luôn!!"}
        primaryVariant="danger"
        secondaryLabel="Làm bài tiếp!!"
        onPrimary={() => {
          void submitAttempt({ auto: false });
        }}
        onSecondary={() => setShowConfirmModal(false)}
        disablePrimary={!canSubmit}
      />

      <AttemptModal
        open={showSuccessModal}
        title="Nộp bài thành công!!!!"
        subtitle={buildSuccessSubtitle(attempt, isTimed)}
        primaryLabel="Xem kết quả thôi!!!"
        primaryVariant="success"
        secondaryLabel="Về trang chủ"
        onPrimary={() => router.push(`/attempts/${attemptId}/results`)}
        onSecondary={() => router.push("/dashboard")}
        dismissible={false}
      />
    </div>
  );
}

function buildAnswerPayload(question: AttemptQuestion, draft: AnswerDraft) {
  if (question.type === "short_answer") {
    return {
      questionId: question.id,
      textAnswer: draft.textAnswer ?? null,
    };
  }

  return {
    questionId: question.id,
    selectedOptionIds: draft.selectedOptionIds ?? null,
  };
}

function buildSubmitPayload(
  questions: AttemptQuestion[],
  drafts: Record<string, AnswerDraft>,
) {
  return questions.map((question) =>
    buildAnswerPayload(
      question,
      drafts[question.id] ?? { selectedOptionIds: null, textAnswer: null },
    ),
  );
}

function AttemptModal({
  open,
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  disablePrimary,
  primaryVariant,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  disablePrimary?: boolean;
  primaryVariant: "danger" | "success";
  dismissible?: boolean;
}) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    primaryRef.current?.focus();
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onSecondary();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dismissible, open, onSecondary]);

  useEffect(() => {
    if (!open) return;
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (node) =>
          !node.hasAttribute("disabled") &&
          node.getAttribute("tabindex") !== "-1",
      );
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
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  const primaryClass = [
    styles.modalPrimary,
    primaryVariant === "danger"
      ? styles.modalDanger
      : styles.modalSuccessPrimary,
  ].join(" ");

  return (
    <div className={styles.modal} role="presentation">
      <div
        className={styles.backdrop}
        onClick={dismissible ? onSecondary : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
      >
        <h2 id={titleId} className={styles.modalTitle}>
          {title}
        </h2>
        <div id={subtitleId} className={styles.modalSubtitle}>
          {subtitle}
        </div>
        <div className={styles.modalActions}>
          <button
            ref={primaryRef}
            type="button"
            className={primaryClass}
            onClick={onPrimary}
            disabled={disablePrimary}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className={styles.modalSecondary}
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function buildSuccessSubtitle(
  attempt: {
    startedAt: string;
    submittedAt: string | null;
    timeLimitSeconds: number | null;
  },
  isTimed: boolean,
) {
  if (!attempt.submittedAt) {
    return isTimed ? "Bài đã được nộp." : "Bài đã được nộp.";
  }
  const startedMs = new Date(attempt.startedAt).getTime();
  const submittedMs = new Date(attempt.submittedAt).getTime();
  const elapsed = Math.max(0, Math.floor((submittedMs - startedMs) / 1000));
  return `Bạn đã hoàn thành bài quiz trong ${formatClock(elapsed)} phút`;
}

function buildNavigatorLabel(params: {
  position: number;
  answered: boolean;
  flagged: boolean;
  active: boolean;
}) {
  const segments = [`Câu ${params.position}`];
  segments.push(params.answered ? "đã trả lời" : "chưa trả lời");
  if (params.flagged) segments.push("đã đánh dấu");
  if (params.active) segments.push("hiện tại");
  return segments.join(", ");
}
