"use client";

import { Clock, ListChecks } from "phosphor-react";
import { useMemo, useState } from "react";
import type { QuizListItem } from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import {
  DifficultyBadge,
  SubjectBadge,
} from "@/components/quiz-catalog/quiz-badges";
import { formatDateVi } from "@/lib/formatters";
import cardStyles from "./staff-quiz-card.module.css";

type StaffQuizCardProps = {
  quiz: QuizListItem;
  subjects: Subject[];
  onEdit: (quizId: string) => void;
  onMutated: () => void;
};

type QuizMutationError = { message: string; code?: string } | null;

export function StaffQuizCard({
  quiz,
  subjects,
  onEdit,
  onMutated,
}: StaffQuizCardProps) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mutationError, setMutationError] = useState<QuizMutationError>(null);

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
    setMutationError(null);
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
      setMutationError({
        message: err instanceof Error ? err.message : "Có lỗi xảy ra",
      });
    } finally {
      setPublishing(false);
    }
  };

  const deleteQuiz = async () => {
    const ok = window.confirm("Xóa quiz này?");
    if (!ok) return;

    setMutationError(null);
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
      setMutationError({
        message: payload?.error ?? "Không thể xóa quiz",
        code: payload?.code,
      });
    } catch (err) {
      setMutationError({
        message: err instanceof Error ? err.message : "Có lỗi xảy ra",
      });
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
          onClick={deleteQuiz}
        >
          {deleting ? "Đang xóa..." : "Xóa"}
        </button>
      </div>

      {mutationError ? (
        <div className={cardStyles.cardError} role="alert">
          <div>
            {mutationError.code === "QUIZ_HAS_ATTEMPTS"
              ? "Quiz đã có lượt thi. Không thể xóa."
              : mutationError.message}
            <div className={cardStyles.cardErrorActions}>
              <button
                type="button"
                className={`${cardStyles.btn} ${cardStyles.btnBlue}`}
                onClick={() => setMutationError(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
