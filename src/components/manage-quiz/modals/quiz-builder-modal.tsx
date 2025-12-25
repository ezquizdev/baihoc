"use client";

import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DotsSixVertical, X } from "phosphor-react";
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
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    void quizId;
    setQuiz(null);
    setDescription("");
    setQuestions([]);
    setError(null);
    setBankOpen(false);
    setActiveQuestionId(null);
  }, [quizId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
        const nextQuestions = [...(nextQuiz.questions ?? [])].sort(
          (a, b) => a.position - b.position,
        );
        setQuestions((prev) => {
          if (prev.length === 0) return nextQuestions;
          if (nextQuestions.length === 0) return prev;
          const freshById = new Map(nextQuestions.map((q) => [q.id, q]));
          return prev.map((q) => {
            const fresh = freshById.get(q.id);
            if (!fresh) return q;
            return {
              ...q,
              stem: fresh.stem,
              type: fresh.type,
              defaultScore: fresh.defaultScore,
            };
          });
        });
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

  useEffect(() => {
    if (!quizId) return;
    if (activeQuestionId) {
      document.body.dataset.dndDragging = "true";
    } else {
      delete document.body.dataset.dndDragging;
    }
    return () => {
      delete document.body.dataset.dndDragging;
    };
  }, [activeQuestionId, quizId]);

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

  const questionIds = questions.map((q) => q.id);
  const questionPositionById = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q, idx) => {
      map.set(q.id, idx + 1);
    });
    return map;
  }, [questions]);

  const dndAccessibility = useMemo(() => {
    const labelFor = (id: unknown) => {
      const position = questionPositionById.get(String(id));
      return position ? `Câu ${position}` : "Câu hỏi";
    };

    return {
      announcements: {
        onDragStart({ active }) {
          return `Bắt đầu kéo ${labelFor(active.id)}.`;
        },
        onDragOver({ active, over }) {
          if (!over) return `${labelFor(active.id)} không còn ở vị trí hợp lệ.`;
          const from = labelFor(active.id);
          const to = labelFor(over.id);
          if (from === to) return;
          return `${from} đang ở vị trí của ${to}.`;
        },
        onDragEnd({ active, over }) {
          if (!over) return `Đã thả ${labelFor(active.id)}.`;
          const from = labelFor(active.id);
          const to = labelFor(over.id);
          if (from === to) return `Đã thả ${from}.`;
          return `${from} đã được di chuyển tới vị trí của ${to}.`;
        },
        onDragCancel({ active }) {
          return `Đã hủy kéo ${labelFor(active.id)}.`;
        },
      },
      screenReaderInstructions: {
        draggable:
          "Để sắp xếp câu hỏi: nhấn Space để nhấc, dùng ↑/↓ để di chuyển, nhấn Space lần nữa để thả, hoặc nhấn Escape để hủy.",
      },
    } as const;
  }, [questionPositionById]);

  if (!quizId) return null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveQuestionId(String(event.active.id));
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveQuestionId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveQuestionId(null);
    if (!over) return;
    if (active.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

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
              <div className={styles.builderHint}>
                Kéo thả để sắp xếp (hoặc dùng ↑↓).
              </div>

              <DndContext
                sensors={sensors}
                accessibility={dndAccessibility}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragCancel={handleDragCancel}
                onDragEnd={handleDragEnd}
                modifiers={[
                  restrictToVerticalAxis,
                  restrictToFirstScrollableAncestor,
                ]}
              >
                <SortableContext
                  items={questionIds}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className={styles.qList} aria-label="Danh sách câu hỏi">
                    {questions.map((q, idx) => (
                      <SortableQuestionCard
                        key={q.id}
                        question={q}
                        index={idx}
                        total={questions.length}
                        disabled={toolDisabled}
                        onEdit={() => onEditQuestion(q.id, idx + 1)}
                        onRemove={() => {
                          const ok = window.confirm(
                            "Xóa câu hỏi này khỏi quiz?",
                          );
                          if (!ok) return;
                          setQuestions((prev) =>
                            prev.filter((item) => item.id !== q.id),
                          );
                        }}
                        onMoveUp={() => {
                          if (idx === 0) return;
                          setQuestions((prev) => arrayMove(prev, idx, idx - 1));
                        }}
                        onMoveDown={() => {
                          if (idx >= questions.length - 1) return;
                          setQuestions((prev) => arrayMove(prev, idx, idx + 1));
                        }}
                        onScoreChange={(nextScore) => {
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, score: nextScore }
                                : item,
                            ),
                          );
                        }}
                        onToggleRequired={() => {
                          setQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, required: !item.required }
                                : item,
                            ),
                          );
                        }}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

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

function SortableQuestionCard({
  question,
  index,
  total,
  disabled,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onScoreChange,
  onToggleRequired,
}: {
  question: QuizQuestionSummary;
  index: number;
  total: number;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onScoreChange: (score: number | null) => void;
  onToggleRequired: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
    disabled,
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  } as const;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.qCard} ${isDragging ? styles.qCardDragging : ""}`}
      data-qid={question.id}
    >
      <div className={styles.qTitleRow}>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className={styles.qDragHandle}
          aria-label="Kéo để sắp xếp"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} weight="bold" aria-hidden="true" />
        </button>
        <div className={styles.qTitle}>{`Câu ${index + 1}:`}</div>
      </div>

      <p className={styles.qText}>{question.stem}</p>

      <div className={styles.qMetaRow}>
        <label className={styles.qMetaItem}>
          <span>Điểm</span>
          <input
            className={styles.qScoreInput}
            type="number"
            min={1}
            placeholder={String(question.defaultScore)}
            value={question.score ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              onScoreChange(raw ? Number(raw) : null);
            }}
            disabled={disabled}
          />
          <span className={styles.qMetaHint}>
            mặc định: {question.defaultScore}
          </span>
        </label>

        <label className={styles.qMetaToggle}>
          <input
            type="checkbox"
            checked={question.required}
            onChange={onToggleRequired}
            disabled={disabled}
          />
          Bắt buộc
        </label>

        <div className={styles.qMove}>
          <button
            type="button"
            className={`${styles.smallBtn} ${styles.smallGray}`}
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            aria-label="Đưa lên"
          >
            ↑
          </button>
          <button
            type="button"
            className={`${styles.smallBtn} ${styles.smallGray}`}
            onClick={onMoveDown}
            disabled={disabled || index >= total - 1}
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
          onClick={onEdit}
          disabled={disabled}
        >
          Sửa
        </button>
        <button
          className={`${styles.smallBtn} ${styles.smallRed}`}
          type="button"
          onClick={onRemove}
          disabled={disabled}
        >
          Xóa
        </button>
      </div>
    </li>
  );
}
