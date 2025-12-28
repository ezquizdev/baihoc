"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type ScreenReaderInstructions,
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
import { ArrowLeft, DotsSixVertical, X } from "phosphor-react";
import { useEffect, useMemo, useState } from "react";
import type {
  QuizDetail,
  QuizQuestionSummary,
} from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import { subscribeQuizBuilderAddQuestion } from "@/components/manage-quiz/quiz-builder-callback";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { NoticeModal } from "@/components/ui/notice-modal";
import { RichText } from "@/components/ui/rich-text";
import styles from "./manage-quiz-modals.module.css";
import { QuestionBankPickerModal } from "./question-bank-picker-modal";

type QuizBuilderModalProps = {
  quizId: string | null;
  refreshKey: number;
  subjects: Subject[];
  onClose: () => void;
  onEditQuestion: (questionId: string, position: number) => void;
  onMutated: () => void;
  variant?: "modal" | "page";
};

export function QuizBuilderModal({
  quizId,
  refreshKey,
  subjects,
  onClose,
  onEditQuestion,
  onMutated,
  variant = "modal",
}: QuizBuilderModalProps) {
  const titleId = "manage-quiz-builder-title";
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [removeCandidateId, setRemoveCandidateId] = useState<string | null>(
    null,
  );
  const [passageFixCandidate, setPassageFixCandidate] = useState<{
    mode: "draft" | "publish";
    passages: Array<{
      passageId: string;
      missingQuestionIds: string[];
      needsReorder: boolean;
      needsConsecutive: boolean;
    }>;
    suggested: Array<{
      questionId: string;
      position: number;
      score: number | null;
      required: boolean;
    }>;
  } | null>(null);
  const [passageFixBusy, setPassageFixBusy] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    void quizId;
    setQuiz(null);
    setDescription("");
    setQuestions([]);
    setError(null);
    setFlashMessage(null);
    setBankOpen(false);
    setNotice(null);
    setRemoveCandidateId(null);
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

  const createQuestionUrl = useMemo(() => {
    if (!quizId) return "/staff/questions/new";
    const params = new URLSearchParams({ from: "quiz-builder", quizId });
    return `/staff/questions/new?${params}`;
  }, [quizId]);

  useEffect(() => {
    if (!quizId) return;
    return subscribeQuizBuilderAddQuestion(quizId, ({ question }) => {
      setQuestions((prev) => {
        if (prev.some((item) => item.id === question.id)) return prev;
        return [
          ...prev,
          {
            id: question.id,
            stem: question.stem,
            type: question.type,
            defaultScore: question.defaultScore,
            position: prev.length + 1,
            score: null,
            required: true,
          },
        ];
      });
      setFlashMessage(
        "Đã thêm câu hỏi mới. Nhớ bấm “Lưu nháp” hoặc “Đăng” để lưu vào quiz.",
      );
    });
  }, [quizId]);

  useEffect(() => {
    if (!flashMessage) return;
    const timeout = window.setTimeout(() => setFlashMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  class SaveQuestionsError extends Error {
    code: string;
    details: unknown;
    constructor(message: string, code: string, details: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }

  const saveQuestions = async (nextQuestions = questions) => {
    if (!quizId) return;
    const payload = {
      questions: nextQuestions.map((q, idx) => ({
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
      const message =
        isRecord(data) && typeof data.error === "string"
          ? data.error
          : "Không thể cập nhật danh sách câu hỏi";
      const code =
        isRecord(data) && typeof data.code === "string" ? data.code : "ERROR";
      const details = isRecord(data) ? data.details : undefined;
      throw new SaveQuestionsError(message, code, details);
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

  const doSave = async (
    mode: "draft" | "publish",
    overrideQuestions?: QuizQuestionSummary[],
  ) => {
    if (!quizId) return;
    const workingQuestions = overrideQuestions ?? questions;
    if (mode === "publish" && workingQuestions.length === 0) {
      setError(
        "Quiz chưa có câu hỏi. Vui lòng thêm ít nhất 1 câu hỏi trước khi xuất bản.",
      );
      return;
    }
    setError(null);
    try {
      setSaving(true);
      await saveQuestions(workingQuestions);
      if (mode === "draft") {
        await saveMeta("draft");
      } else {
        await saveMeta();
        await publish();
      }
      onMutated();
      onClose();
    } catch (err) {
      if (err instanceof SaveQuestionsError) {
        if (
          err.code === "QUIZ_PASSAGE_GROUP_INVALID" &&
          isRecord(err.details) &&
          Array.isArray(err.details.passages) &&
          isRecord(err.details.suggested) &&
          Array.isArray(err.details.suggested.questions)
        ) {
          const passages = err.details.passages
            .filter((p): p is Record<string, unknown> => isRecord(p))
            .map((p) => ({
              passageId: String(p.passageId ?? ""),
              missingQuestionIds: Array.isArray(p.missingQuestionIds)
                ? (p.missingQuestionIds as unknown[]).filter(
                    (id): id is string => typeof id === "string",
                  )
                : [],
              needsReorder: Boolean(p.needsReorder),
              needsConsecutive: Boolean(p.needsConsecutive),
            }))
            .filter((p) => p.passageId);

          const suggested = err.details.suggested.questions
            .filter((q): q is Record<string, unknown> => isRecord(q))
            .map((q) => ({
              questionId: String(q.questionId ?? ""),
              position: Number(q.position ?? 0),
              score:
                q.score === null
                  ? null
                  : typeof q.score === "number"
                    ? q.score
                    : null,
              required: Boolean(q.required),
            }))
            .filter((q) => q.questionId);

          if (passages.length && suggested.length) {
            setPassageFixCandidate({ mode, passages, suggested });
            return;
          }
        }
      }
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

    const announcements: Announcements = {
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
    };

    const screenReaderInstructions: ScreenReaderInstructions = {
      draggable:
        "Để sắp xếp câu hỏi: nhấn Space để nhấc, dùng ↑/↓ để di chuyển, nhấn Space lần nữa để thả, hoặc nhấn Escape để hủy.",
    };

    return {
      announcements,
      screenReaderInstructions,
    };
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

  const head = (
    <div className={styles.dialogHead}>
      <button
        className={styles.xbtn}
        type="button"
        onClick={onClose}
        aria-label={variant === "modal" ? "Close" : "Quay lại"}
        disabled={toolDisabled}
      >
        {variant === "modal" ? (
          <X size={16} weight="bold" />
        ) : (
          <ArrowLeft size={16} weight="bold" />
        )}
      </button>
    </div>
  );

  const content = (
    <>
      {loading ? <output aria-live="polite">Đang tải quiz...</output> : null}
      {flashMessage ? (
        <output className={styles.inlineNotice} aria-live="polite">
          {flashMessage}
        </output>
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
              className={`${styles.toolBtn} ${styles.toolYellow} ${
                toolDisabled ? styles.toolBtnDisabled : ""
              }`}
              type="button"
              onClick={() => {
                if (toolDisabled) return;
                const opened = window.open(createQuestionUrl, "_blank");
                if (!opened) {
                  setNotice({
                    title: "Không thể mở tab mới",
                    message:
                      "Trình duyệt đang chặn mở tab mới. Vui lòng cho phép pop-up và thử lại.",
                  });
                }
              }}
              disabled={toolDisabled}
            >
              Tạo câu hỏi mới
            </button>
            <button
              className={`${styles.toolBtn} ${styles.toolDark}`}
              type="button"
              onClick={() =>
                setNotice({
                  title: "Chưa hỗ trợ",
                  message: "Chưa hỗ trợ: import quiz từ file",
                })
              }
              disabled={toolDisabled}
            >
              Tải quiz từ file
            </button>
          </div>

          <div className={styles.builderSection}>Câu hỏi</div>
          <div className={styles.builderHint}>Kéo thả để sắp xếp.</div>

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
                    disabled={toolDisabled}
                    onEdit={() => onEditQuestion(q.id, idx + 1)}
                    onRemove={() => setRemoveCandidateId(q.id)}
                    onScoreChange={(nextScore) => {
                      setQuestions((prev) =>
                        prev.map((item) =>
                          item.id === q.id
                            ? { ...item, score: nextScore }
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
    </>
  );

  const overlays = (
    <>
      <QuestionBankPickerModal
        open={bankOpen}
        subjects={subjects}
        existingQuestionIds={questions.map((q) => q.id)}
        createQuestionUrl={createQuestionUrl}
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

      <NoticeModal
        open={notice !== null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />

      <ConfirmModal
        open={removeCandidateId !== null}
        title="Xóa câu hỏi khỏi quiz?"
        message="Bạn có chắc chắn muốn xóa câu hỏi này khỏi quiz?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        confirmVariant="danger"
        onCancel={() => setRemoveCandidateId(null)}
        onConfirm={() => {
          const targetId = removeCandidateId;
          setRemoveCandidateId(null);
          if (!targetId) return;
          setQuestions((prev) => prev.filter((q) => q.id !== targetId));
        }}
      />

      <ConfirmModal
        open={passageFixCandidate !== null}
        title="Tự động bổ sung & sắp xếp câu hỏi passage?"
        message={
          passageFixCandidate
            ? `Quiz có câu hỏi thuộc passage nhưng chưa đủ hoặc chưa được xếp liền nhau đúng thứ tự. Hệ thống có thể tự động bổ sung câu hỏi còn thiếu và sắp xếp lại để đáp ứng yêu cầu. Tiếp tục?`
            : ""
        }
        confirmLabel={passageFixBusy ? "Đang xử lý..." : "Tự động sửa"}
        cancelLabel="Hủy"
        disableConfirm={passageFixBusy}
        onCancel={() => setPassageFixCandidate(null)}
        onConfirm={() => {
          const candidate = passageFixCandidate;
          setPassageFixCandidate(null);
          if (!candidate) return;
          void (async () => {
            try {
              setPassageFixBusy(true);

              const passageIds = Array.from(
                new Set(candidate.passages.map((p) => p.passageId)),
              );
              const fetched = await Promise.all(
                passageIds.map(async (passageId) => {
                  const res = await fetch(`/api/staff/passages/${passageId}`);
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(data?.error ?? "Không thể tải passage");
                  }
                  return data;
                }),
              );

              const byId = new Map<string, QuizQuestionSummary>();
              questions.forEach((q, idx) => {
                byId.set(q.id, { ...q, position: idx + 1 });
              });

              fetched.forEach((payload) => {
                if (!isRecord(payload) || !Array.isArray(payload.questions))
                  return;
                (payload.questions as unknown[]).forEach((q) => {
                  if (!isRecord(q)) return;
                  const id = typeof q.id === "string" ? q.id : null;
                  if (!id) return;
                  if (byId.has(id)) return;
                  byId.set(id, {
                    id,
                    stem: typeof q.stem === "string" ? q.stem : "",
                    type: typeof q.type === "string" ? q.type : "",
                    defaultScore:
                      typeof q.defaultScore === "number" ? q.defaultScore : 1,
                    position: 0,
                    score: null,
                    required: true,
                  });
                });
              });

              const nextQuestions: QuizQuestionSummary[] = candidate.suggested
                .sort((a, b) => a.position - b.position)
                .map((entry, idx) => {
                  const base = byId.get(entry.questionId);
                  if (!base) {
                    throw new Error(
                      "Không thể tự động bổ sung câu hỏi passage.",
                    );
                  }
                  return {
                    ...base,
                    position: idx + 1,
                    score: entry.score ?? null,
                    required: entry.required ?? true,
                  };
                });

              setQuestions(nextQuestions);
              await doSave(candidate.mode, nextQuestions);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Không thể tự động sửa",
              );
            } finally {
              setPassageFixBusy(false);
            }
          })();
        }}
      />
    </>
  );

  if (variant === "modal") {
    return (
      <div className={styles.modal} role="presentation">
        <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
        <div
          className={`${styles.dialog} ${styles.dialogLarge}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {head}
          <div className={styles.builderScroll}>{content}</div>
        </div>
        {overlays}
      </div>
    );
  }

  return (
    <>
      {head}
      {content}
      {overlays}
    </>
  );
}

function SortableQuestionCard({
  question,
  index,
  disabled,
  onEdit,
  onRemove,
  onScoreChange,
}: {
  question: QuizQuestionSummary;
  index: number;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onScoreChange: (score: number | null) => void;
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

      <RichText
        content={question.stem}
        className={styles.qText}
        allowLinks={false}
      />

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
