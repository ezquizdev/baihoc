"use client";

import { useRouter } from "next/navigation";
import { X } from "phosphor-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DifficultyLevel } from "@/application/models/enums";
import type { Subject } from "@/application/models/subject";
import type { Topic } from "@/application/models/topic";
import styles from "./generate-custom-quiz-modal.module.css";
import { getSubjectTone } from "./subject-tone";

type GenerateCustomQuizModalProps = {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
};

const difficultyOptions: DifficultyLevel[] = [5, 4, 3, 2, 1];
const questionCountOptions = [10, 20, 30, 40] as const;

export function GenerateCustomQuizModal({
  open,
  subjects,
  onClose,
}: GenerateCustomQuizModalProps) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const hadModalOpenClassRef = useRef(false);

  const [quizTitle, setQuizTitle] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(4);
  const [questionCount, setQuestionCount] = useState<number>(20);
  const recommendedMinutes = useMemo(
    () => Math.max(1, Math.round(questionCount * 1.5)),
    [questionCount],
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>(
    String(recommendedMinutes),
  );
  const [timeTouched, setTimeTouched] = useState(false);
  const parsedMinutes = Number.parseInt(timeLimitMinutes, 10);
  const normalizedMinutes =
    Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : null;
  const durationSeconds = normalizedMinutes ? normalizedMinutes * 60 : null;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [useWrongHistory, setUseWrongHistory] = useState(false);
  const [useCustomTopics, setUseCustomTopics] = useState(true);

  const [selectedBySubject, setSelectedBySubject] = useState<
    Record<string, string[]>
  >({});
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [searchBySubject, setSearchBySubject] = useState<
    Record<string, string>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const topicsBySubject = useMemo(() => {
    const bySubject = new Map<string, Topic[]>();
    topics.forEach((topic) => {
      const existing = bySubject.get(topic.subjectId) ?? [];
      existing.push(topic);
      bySubject.set(topic.subjectId, existing);
    });
    bySubject.forEach((items) => {
      items.sort((a, b) => a.name.localeCompare(b.name));
    });
    return bySubject;
  }, [topics]);

  const topicById = useMemo(() => {
    const map = new Map<string, Topic>();
    topics.forEach((topic) => {
      map.set(topic.id, topic);
    });
    return map;
  }, [topics]);

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
    setQuizTitle("");
    setDifficulty(4);
    setQuestionCount(20);
    setTimeLimitMinutes(String(Math.max(1, Math.round(20 * 1.5))));
    setTimeTouched(false);
    setUseWrongHistory(false);
    setUseCustomTopics(true);
    setSelectedBySubject({});
    setOpenSubjectId(null);
    setSearchBySubject({});
    setSubmitError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (topics.length) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const response = await fetch("/api/catalog/topics", {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? "Không thể tải danh sách chủ đề");
        }
        setTopics(
          Array.isArray(payload.items) ? (payload.items as Topic[]) : [],
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setTopicsError(
          err instanceof Error ? err.message : "Không thể tải danh sách chủ đề",
        );
      } finally {
        setTopicsLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [open, topics.length]);

  useEffect(() => {
    if (!open || !openSubjectId) return;
    const handlePointer = (event: MouseEvent) => {
      const container = pickerRefs.current[openSubjectId];
      if (!container) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!container.contains(target)) {
        setOpenSubjectId(null);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open, openSubjectId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (openSubjectId) {
          setOpenSubjectId(null);
          return;
        }
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
  }, [onClose, open, openSubjectId]);

  useEffect(() => {
    if (!open) return;
    if (timeTouched) return;
    setTimeLimitMinutes(String(recommendedMinutes));
  }, [open, recommendedMinutes, timeTouched]);

  if (!open) return null;

  const disabled = submitting;
  const wrongHistoryDisabled = true;

  const hasAnyTopicSelected = Object.values(selectedBySubject).some(
    (ids) => ids.length > 0,
  );

  const submit = async () => {
    setSubmitError(null);

    if (useWrongHistory) {
      setSubmitError("Tạo quiz theo lịch sử sai đang được phát triển.");
      return;
    }
    if (!useCustomTopics) {
      setSubmitError("Vui lòng chọn chế độ tạo quiz.");
      return;
    }
    if (!hasAnyTopicSelected) {
      setSubmitError("Vui lòng chọn ít nhất 1 chủ đề.");
      return;
    }
    if (!normalizedMinutes) {
      setSubmitError("Vui lòng nhập thời gian hợp lệ (phút).");
      return;
    }

    const topicsBySubjectPayload = subjects
      .map((subject) => {
        const topicIds = selectedBySubject[subject.id] ?? [];
        return topicIds.length ? { subjectId: subject.id, topicIds } : null;
      })
      .filter((entry): entry is { subjectId: string; topicIds: string[] } =>
        Boolean(entry),
      );

    if (!topicsBySubjectPayload.length) {
      setSubmitError("Vui lòng chọn ít nhất 1 chủ đề.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: quizTitle.trim() ? quizTitle.trim() : undefined,
        difficulty,
        questionCount,
        durationSeconds,
        topicsBySubject: topicsBySubjectPayload,
      };
      const response = await fetch("/api/custom-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const base = data?.error ?? "Không thể tạo quiz tuỳ chỉnh";
        if (data?.code === "QUESTION_BANK_INSUFFICIENT") {
          throw new Error(`${base} Hãy giảm số câu hoặc chọn thêm chủ đề.`);
        }
        throw new Error(base);
      }
      const quizId = data?.quizId as string | undefined;
      if (!quizId) throw new Error("Không thể tạo quiz tuỳ chỉnh");
      onClose();
      router.push(`/quizzes/${quizId}/attempt`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Không thể tạo quiz tuỳ chỉnh",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.dialogHead}>
          <button
            className={styles.xbtn}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            disabled={disabled}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className={styles.dialogBody}>
          <textarea
            className={styles.titleInput}
            rows={2}
            placeholder="Tên quiz ..."
            aria-label="Tên quiz"
            value={quizTitle}
            onChange={(event) => setQuizTitle(event.target.value)}
            disabled={disabled}
          />

          <section className={styles.infoPanel} aria-label="Thông tin quiz">
            <h3 id={titleId} className={styles.infoTitle}>
              Thông tin quiz
            </h3>

            <div className={styles.formRow}>
              <div className={styles.label}>Độ khó:</div>
              <div
                className={styles.diffPicks}
                role="radiogroup"
                aria-label="Độ khó"
              >
                {difficultyOptions.map((level) => (
                  <label
                    key={level}
                    className={`${styles.ck} ${styles.diffOpt}`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level)}
                      disabled={disabled}
                    />
                    <span className={`${styles.chip} ${diffChipClass(level)}`}>
                      {level} ★
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.label}>Số câu:</div>
              <div
                className={styles.diffPicks}
                role="radiogroup"
                aria-label="Số câu"
              >
                {questionCountOptions.map((count) => (
                  <label key={count} className={styles.ck}>
                    <input
                      type="radio"
                      name="questionCount"
                      checked={questionCount === count}
                      onChange={() => setQuestionCount(count)}
                      disabled={disabled}
                    />
                    {count}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.ck}>
                <input
                  type="checkbox"
                  checked={useWrongHistory}
                  onChange={(event) => {
                    setUseWrongHistory(event.target.checked);
                    if (event.target.checked) {
                      setUseCustomTopics(false);
                    }
                  }}
                  disabled={disabled || wrongHistoryDisabled}
                />
                Tạo quiz dựa trên lịch sử sai
              </label>
              <label className={styles.ck}>
                <input
                  type="checkbox"
                  checked={useCustomTopics}
                  onChange={(event) => {
                    setUseCustomTopics(event.target.checked);
                    if (event.target.checked) {
                      setUseWrongHistory(false);
                    }
                  }}
                  disabled={disabled}
                />
                Tạo quiz với chủ đề tự chọn
              </label>
            </div>

            <div className={styles.formRow}>
              <div className={styles.label}>Thời gian:</div>
              <div className={styles.timeField}>
                <input
                  type="number"
                  min={1}
                  className={styles.timeInput}
                  aria-label="Thời gian (phút)"
                  value={timeLimitMinutes}
                  onChange={(event) => {
                    setTimeLimitMinutes(event.target.value);
                    setTimeTouched(true);
                  }}
                  disabled={disabled}
                />
                <span className={styles.timeUnit}>phút</span>
                <span className={styles.timeHint}>
                  Gợi ý: {recommendedMinutes} phút
                </span>
              </div>
            </div>

            <div className={styles.hint}>
              {wrongHistoryDisabled
                ? "Gợi ý: chế độ lịch sử sai sẽ được bổ sung sau."
                : null}
            </div>
          </section>

          <section className={styles.topicsPanel} aria-label="Chủ đề">
            <h4 className={styles.topicsTitle}>Chủ đề</h4>

            {topicsLoading ? (
              <div className={styles.hint}>Đang tải danh sách chủ đề...</div>
            ) : topicsError ? (
              <div className={styles.inlineError} role="alert">
                {topicsError}
              </div>
            ) : null}

            {subjects.map((subject) => (
              <div key={subject.id} className={styles.topicRow}>
                <div className={styles.topicSubject}>{subject.name}:</div>

                <div
                  className={styles.topicPicker}
                  ref={(node) => {
                    pickerRefs.current[subject.id] = node;
                  }}
                >
                  {(selectedBySubject[subject.id] ?? []).map((topicId) => {
                    const topic = topicById.get(topicId);
                    if (!topic) return null;
                    const tone = toneKey(subject.slug);
                    return (
                      <span
                        key={topicId}
                        className={`${styles.topicChip} ${tone ? chipToneClass(tone) : ""}`.trim()}
                      >
                        <span>{topic.name}</span>
                        <button
                          type="button"
                          className={styles.topicChipRemove}
                          aria-label={`Xoá chủ đề ${topic.name}`}
                          onClick={() => {
                            setSelectedBySubject((prev) => {
                              const current = prev[subject.id] ?? [];
                              const next = current.filter(
                                (id) => id !== topicId,
                              );
                              if (!next.length) {
                                const { [subject.id]: _, ...rest } = prev;
                                return rest;
                              }
                              return { ...prev, [subject.id]: next };
                            });
                          }}
                          disabled={disabled}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}

                  <input
                    className={`${styles.topicInput} ${inputToneClass(
                      toneKey(subject.slug),
                    )}`.trim()}
                    placeholder="Nhập chủ đề ..."
                    value={searchBySubject[subject.id] ?? ""}
                    onChange={(event) =>
                      setSearchBySubject((prev) => ({
                        ...prev,
                        [subject.id]: event.target.value,
                      }))
                    }
                    onFocus={() => setOpenSubjectId(subject.id)}
                    disabled={disabled || topicsLoading || Boolean(topicsError)}
                  />

                  {openSubjectId === subject.id ? (
                    <TopicDropdown
                      subject={subject}
                      topics={topicsBySubject.get(subject.id) ?? []}
                      search={searchBySubject[subject.id] ?? ""}
                      selected={new Set(selectedBySubject[subject.id] ?? [])}
                      disabled={disabled}
                      onToggle={(topicId) =>
                        setSelectedBySubject((prev) => {
                          const current = prev[subject.id] ?? [];
                          const exists = current.includes(topicId);
                          const next = exists
                            ? current.filter((id) => id !== topicId)
                            : [...current, topicId];
                          if (!next.length) {
                            const { [subject.id]: _, ...rest } = prev;
                            return rest;
                          }
                          return { ...prev, [subject.id]: next };
                        })
                      }
                      onToggleAll={() =>
                        setSelectedBySubject((prev) => {
                          const all = topicsBySubject.get(subject.id) ?? [];
                          const current = new Set(prev[subject.id] ?? []);
                          const allSelected =
                            all.length > 0 &&
                            all.every((topic) => current.has(topic.id));

                          if (allSelected) {
                            const { [subject.id]: _, ...rest } = prev;
                            return rest;
                          }

                          const ids = all.map((topic) => topic.id);
                          return ids.length
                            ? { ...prev, [subject.id]: ids }
                            : prev;
                        })
                      }
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          {submitError ? (
            <div className={styles.inlineError} role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionDanger} ${
              disabled ? styles.actionDisabled : ""
            }`.trim()}
            onClick={onClose}
            disabled={disabled}
          >
            Huỷ
          </button>
          <button
            ref={primaryRef}
            type="button"
            className={`${styles.actionBtn} ${styles.actionPrimary} ${
              disabled ? styles.actionDisabled : ""
            }`.trim()}
            onClick={submit}
            disabled={disabled}
          >
            {submitting ? "Đang tạo..." : "Tạo quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopicDropdown({
  subject,
  topics,
  search,
  selected,
  disabled,
  onToggle,
  onToggleAll,
}: {
  subject: Subject;
  topics: Topic[];
  search: string;
  selected: Set<string>;
  disabled: boolean;
  onToggle: (topicId: string) => void;
  onToggleAll: () => void;
}) {
  const normalized = search.trim().toLowerCase();
  const filtered = normalized
    ? topics.filter((topic) => topic.name.toLowerCase().includes(normalized))
    : topics;
  const allSelected =
    topics.length > 0 && topics.every((topic) => selected.has(topic.id));

  return (
    <div
      className={styles.dropdown}
      role="listbox"
      aria-label={`Chọn chủ đề ${subject.name}`}
    >
      <div className={styles.dropdownScroll}>
        <label className={`${styles.ck} ${styles.dropdownRow}`}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={disabled || topics.length === 0}
          />
          <span className={styles.dropdownLabel}>Chọn tất cả</span>
        </label>

        {filtered.length === 0 ? (
          <div className={styles.hint}>
            {topics.length === 0
              ? "Chưa có chủ đề cho môn này."
              : "Không tìm thấy chủ đề phù hợp."}
          </div>
        ) : (
          filtered.map((topic) => (
            <label
              key={topic.id}
              className={`${styles.ck} ${styles.dropdownRow}`}
            >
              <input
                type="checkbox"
                checked={selected.has(topic.id)}
                onChange={() => onToggle(topic.id)}
                disabled={disabled}
              />
              <span className={styles.dropdownLabel}>{topic.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function diffChipClass(level: DifficultyLevel) {
  switch (level) {
    case 5:
      return styles.c5;
    case 4:
      return styles.c4;
    case 3:
      return styles.c3;
    case 2:
      return styles.c2;
    case 1:
      return styles.c1;
  }
}

function toneKey(subjectSlug: string) {
  const tone = getSubjectTone(subjectSlug);
  if (tone === "vi" || tone === "en" || tone === "math" || tone === "sci") {
    return tone;
  }
  return null;
}

function inputToneClass(tone: ReturnType<typeof toneKey>) {
  if (!tone) return "";
  switch (tone) {
    case "vi":
      return styles.topicInputVi;
    case "en":
      return styles.topicInputEn;
    case "math":
      return styles.topicInputMath;
    case "sci":
      return styles.topicInputSci;
  }
}

function chipToneClass(tone: NonNullable<ReturnType<typeof toneKey>>) {
  switch (tone) {
    case "vi":
      return styles.topicChipVi;
    case "en":
      return styles.topicChipEn;
    case "math":
      return styles.topicChipMath;
    case "sci":
      return styles.topicChipSci;
  }
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
