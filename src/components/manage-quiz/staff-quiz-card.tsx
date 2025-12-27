"use client";

import { Clock, ListChecks } from "phosphor-react";
import { useMemo, useState } from "react";
import type { QuizListItem } from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import {
  DifficultyBadge,
  SubjectBadge,
} from "@/components/quiz-catalog/quiz-badges";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatDateVi } from "@/lib/formatters";
import cardStyles from "./staff-quiz-card.module.css";

type StaffQuizCardProps = {
  quiz: QuizListItem;
  subjects: Subject[];
  onEdit: (quizId: string) => void;
  onMutated: () => void;
  onError: (title: string, message: string) => void;
};

export function StaffQuizCard({
  quiz,
  subjects,
  onEdit,
  onMutated,
  onError,
}: StaffQuizCardProps) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const primarySubject = useMemo(() => {
    const ids = quiz.subjectIds ?? [];
    if (ids.length !== 1) {
      return { name: "Tổng hợp", slug: "mixed" };
    }
    const match = subjects.find((s) => s.id === ids[0]);
    return match
      ? { name: match.name, slug: match.slug }
      : { name: "Tổng hợp", slug: "mixed" };
  }, [quiz.subjectIds, subjects]);

  const minutes = quiz.estimatedTimeSeconds
    ? Math.round(quiz.estimatedTimeSeconds / 60)
    : null;
  const questionCount = quiz.questionCount ?? 0;
  const dateLabel = formatDateVi(quiz.updatedAt ?? quiz.createdAt);
  const isDraft = quiz.status === "draft";
  const canPublish = quiz.status === "draft";
  const busy = publishing || deleting;

  const publishQuiz = async () => {
    try {
      setPublishing(true);
      const response = await fetch(`/api/staff/quizzes/${quiz.id}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xuất bản quiz");
      }
      onMutated();
    } catch (err) {
      onError(
        "Không thể xuất bản quiz",
        err instanceof Error ? err.message : "Có lỗi xảy ra",
      );
    } finally {
      setPublishing(false);
    }
  };

  const deleteQuiz = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/staff/quizzes/${quiz.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onMutated();
        return;
      }
      const payload = await response.json().catch(() => ({}));
      const code = payload?.code as string | undefined;
      onError(
        "Không thể xóa quiz",
        code === "QUIZ_HAS_ATTEMPTS"
          ? "Quiz đã có lượt thi. Không thể xóa."
          : (payload?.error ?? "Không thể xóa quiz"),
      );
    } catch (err) {
      onError(
        "Không thể xóa quiz",
        err instanceof Error ? err.message : "Có lỗi xảy ra",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article
      className={`${cardStyles.quizCard} ${
        quiz.isChallenge ? cardStyles.quizCardChallenge : ""
      }`}
      aria-label={`Quiz ${quiz.id}`}
    >
      <div className={cardStyles.quizHead}>
        <span className={cardStyles.quizDate}>{dateLabel}</span>
        {quiz.visibility === "premium" ? (
          <span className={cardStyles.vip}>VIP</span>
        ) : null}
        <span className={cardStyles.spacer} aria-hidden="true" />
        {isDraft ? <span className={cardStyles.draftChip}>NHÁP</span> : null}
      </div>

      <h4 className={cardStyles.quizTitle}>{quiz.title}</h4>

      <div className={cardStyles.quizInfo}>
        <div className={cardStyles.quizMeta}>
          <div className={cardStyles.quizMetaItem}>
            <span className={cardStyles.metaIcon} aria-hidden="true">
              <ListChecks size={12} weight="bold" />
            </span>
            <span>{questionCount} câu</span>
          </div>
          <div className={cardStyles.quizMetaItem}>
            <span
              className={`${cardStyles.metaIcon} ${cardStyles.metaIconClock}`}
              aria-hidden="true"
            >
              <Clock size={12} weight="bold" />
            </span>
            <span>{minutes !== null ? `${minutes} phút` : "— phút"}</span>
          </div>
        </div>

        <div className={cardStyles.badgeStack}>
          <DifficultyBadge difficulty={quiz.difficulty} />
          <SubjectBadge name={primarySubject.name} slug={primarySubject.slug} />
        </div>
      </div>

      <div
        className={`${cardStyles.actions} ${
          canPublish ? "" : cardStyles.actionsTwo
        }`}
      >
        <button
          type="button"
          className={`${cardStyles.btn} ${cardStyles.btnBlue} ${
            busy ? cardStyles.btnDisabled : ""
          }`}
          disabled={busy}
          onClick={() => onEdit(quiz.id)}
        >
          Chỉnh sửa
        </button>
        {canPublish ? (
          <button
            type="button"
            className={`${cardStyles.btn} ${cardStyles.btnYellow} ${
              busy ? cardStyles.btnDisabled : ""
            }`}
            disabled={busy}
            onClick={publishQuiz}
          >
            {publishing ? "Đang đăng..." : "Đăng"}
          </button>
        ) : null}
        <button
          type="button"
          className={`${cardStyles.btn} ${cardStyles.btnRed} ${
            busy ? cardStyles.btnDisabled : ""
          }`}
          disabled={busy}
          onClick={() => setConfirmDeleteOpen(true)}
        >
          {deleting ? "Đang xóa..." : "Xóa"}
        </button>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Xóa quiz này?"
        message="Bạn có chắc chắn muốn xóa quiz này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        confirmVariant="danger"
        disableConfirm={busy}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          void deleteQuiz();
        }}
      />
    </article>
  );
}
