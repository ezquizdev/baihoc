"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentDashboardHighlightChallengeCardDto } from "@/application/models/studentDashboard";
import { NoticeModal } from "@/components/ui/notice-modal";
import { RichText } from "@/components/ui/rich-text";
import styles from "./daily-challenge-card.module.css";
import { HighlightChallengeResultModal } from "./highlight-challenge-result-modal";

type SubmitState = "idle" | "submitting";

export function HighlightChallengeCard({
  initial,
}: {
  initial: StudentDashboardHighlightChallengeCardDto;
}) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = initial.status === "active" ? initial : null;

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    active?.submission?.selectedOptionIds ?? [],
  );
  const [submission, setSubmission] = useState(active?.submission ?? null);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    active?.submission ? (active.correctOptionIds ?? []) : [],
  );
  const [explanation, setExplanation] = useState<string | null>(
    active?.question.explanation ?? null,
  );
  const [resultOpen, setResultOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  useEffect(() => {
    if (submission) {
      setSelectedOptionIds(submission.selectedOptionIds);
      setHasInteracted(true);
    }
  }, [submission]);

  const questionType = active?.question.type ?? null;
  const isSubmitted = Boolean(submission);

  const selectedSet = useMemo(
    () => new Set(selectedOptionIds),
    [selectedOptionIds],
  );
  const correctSet = useMemo(
    () => new Set(correctOptionIds),
    [correctOptionIds],
  );

  const toggleOption = (optionId: string) => {
    if (!active) return;
    if (isSubmitted) return;
    setHasInteracted(true);
    setError(null);

    if (questionType === "mcq_single") {
      setSelectedOptionIds([optionId]);
      return;
    }

    setSelectedOptionIds((prev) => {
      const set = new Set(prev);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      return Array.from(set);
    });
  };

  const submitVisible = !isSubmitted && hasInteracted;
  const canSubmit =
    active &&
    !isSubmitted &&
    submitState === "idle" &&
    selectedOptionIds.length > 0;

  const submit = async () => {
    if (!active) return;
    if (!canSubmit) return;
    setSubmitState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/dashboard/highlight-challenge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOptionIds }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể nộp câu trả lời");
      }
      const payload = (await res.json()) as {
        selectedOptionIds: string[];
        correctOptionIds: string[];
        isCorrect: boolean;
        explanation: string | null;
      };
      setSubmission({
        selectedOptionIds: payload.selectedOptionIds ?? selectedOptionIds,
        isCorrect: Boolean(payload.isCorrect),
        createdAt: new Date().toISOString(),
      });
      setCorrectOptionIds(
        Array.isArray(payload.correctOptionIds) ? payload.correctOptionIds : [],
      );
      setExplanation(
        payload.explanation ?? active.question.explanation ?? null,
      );
      setResultOpen(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể nộp câu trả lời";
      setError(message);
      setErrorModalOpen(true);
    } finally {
      setSubmitState("idle");
    }
  };

  const openResult = () => {
    if (!active) return;
    if (!submission) return;
    setResultOpen(true);
  };

  if (!active) {
    return (
      <section className={styles.card} aria-label="Highlight challenge">
        <div className={styles.left}>
          <div className={styles.tag}>CHALLENGE</div>
          <div className={styles.titleWrap} aria-hidden="true">
            <div className={styles.quizShape} />
            <div className={styles.quizName}>HIGHLIGHT</div>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.question}>Chưa có highlight challenge.</div>
          <ul className={styles.answers} aria-label="Lựa chọn">
            <li className={styles.pill}>Theo dõi lại sau</li>
          </ul>
          <div className={styles.footer} aria-hidden="true">
            <span className={`${styles.cta} ${styles.ctaHidden}`}>
              Nộp đáp án
            </span>
          </div>
        </div>
      </section>
    );
  }

  const footerLabel = isSubmitted ? "Xem chi tiết" : "Nộp đáp án";

  return (
    <>
      <section
        className={styles.card}
        aria-label="Highlight challenge"
        role={isSubmitted ? "button" : undefined}
        tabIndex={isSubmitted ? 0 : undefined}
        onClick={isSubmitted ? openResult : undefined}
        onKeyDown={
          isSubmitted
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openResult();
                }
              }
            : undefined
        }
      >
        <div className={styles.left}>
          <div className={styles.tag}>
            <span
              className={`${styles.bolt} ${styles.boltTl}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bolt} ${styles.boltBl}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bolt} ${styles.boltTr}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bolt} ${styles.boltBr}`}
              aria-hidden="true"
            />
            CHALLENGE
          </div>
          <div className={styles.titleWrap} aria-hidden="true">
            <div className={styles.quizShape} />
            <div className={styles.quizName}>HIGHLIGHT</div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.question}>
            <RichText content={active.question.stem} allowLinks={false} />
          </div>

          <ul className={styles.answers} aria-label="Lựa chọn">
            {active.options.map((opt) => {
              const isSelected = selectedSet.has(opt.id);
              const isCorrect = isSubmitted && correctSet.has(opt.id);
              const isWrongSelected = isSubmitted && isSelected && !isCorrect;

              const pillClassName = [
                styles.pill,
                styles.pillButton,
                isSelected && !isSubmitted ? styles.active : "",
                isCorrect ? styles.pillCorrect : "",
                isWrongSelected ? styles.pillWrong : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={pillClassName}
                    aria-pressed={isSelected}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isSubmitted) {
                        openResult();
                        return;
                      }
                      toggleOption(opt.id);
                    }}
                    disabled={!isSubmitted && submitState !== "idle"}
                  >
                    <RichText
                      content={opt.text}
                      variant="inline"
                      allowLinks={false}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={styles.footer}>
            {isSubmitted ? (
              <button
                type="button"
                className={styles.cta}
                onClick={(event) => {
                  event.stopPropagation();
                  openResult();
                }}
              >
                {footerLabel}
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.cta} ${submitVisible ? "" : styles.ctaHidden}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void submit();
                }}
                disabled={!canSubmit}
                tabIndex={submitVisible ? 0 : -1}
                aria-hidden={!submitVisible}
              >
                {submitState === "submitting" ? "Đang chấm..." : footerLabel}
              </button>
            )}
          </div>

          {error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <HighlightChallengeResultModal
        open={resultOpen}
        tone={submission?.isCorrect ? "success" : "error"}
        title={submission?.isCorrect ? "Bạn trả lời đúng!" : "Chưa đúng rồi"}
        questionStem={active.question.stem}
        options={active.options}
        selectedOptionIds={submission?.selectedOptionIds ?? selectedOptionIds}
        correctOptionIds={correctOptionIds}
        explanation={explanation}
        actionLabel={active.actionLabel}
        actionHref={active.actionHref}
        onClose={() => setResultOpen(false)}
      />

      <NoticeModal
        open={errorModalOpen}
        tone="error"
        title="Không thể nộp câu trả lời"
        message={error ?? "Không thể nộp câu trả lời."}
        onClose={() => setErrorModalOpen(false)}
      />
    </>
  );
}
