"use client";

import { BookmarkSimple, Clock, ListChecks } from "phosphor-react";
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
  const [bookmarked, setBookmarked] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
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
  const isArchived = quiz.status === "archived";
  const canPublish = quiz.status === "draft";
  const canArchive = quiz.status === "published";
  const busy = publishing || deleting || archiving || restoring;

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

  const archiveQuiz = async () => {
    setMutationError(null);
    try {
      setArchiving(true);
      const response = await fetch(`/api/staff/quizzes/${quiz.id}/archive`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể lưu trữ quiz");
      }
      onMutated();
    } catch (err) {
      setMutationError({
        message: err instanceof Error ? err.message : "Có lỗi xảy ra",
      });
    } finally {
      setArchiving(false);
    }
  };

  const restoreQuiz = async () => {
    setMutationError(null);
    try {
      setRestoring(true);
      const response = await fetch(`/api/staff/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể khôi phục quiz");
      }
      onMutated();
    } catch (err) {
      setMutationError({
        message: err instanceof Error ? err.message : "Có lỗi xảy ra",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <article className={cardStyles.quizCard} aria-label={`Quiz ${quiz.id}`}>
      <div className={cardStyles.quizHead}>
        <span className={cardStyles.quizDate}>{dateLabel}</span>
        {quiz.visibility === "premium" ? (
          <span className={cardStyles.vip}>VIP</span>
        ) : null}
        {isArchived ? <span className={cardStyles.vip}>LƯU TRỮ</span> : null}
        <span className={cardStyles.spacer} aria-hidden="true" />
        <button
          className={`${cardStyles.bookmark} ${
            bookmarked ? cardStyles.bookmarkActive : ""
          }`}
          type="button"
          aria-label="Lưu quiz"
          onClick={() => setBookmarked((prev) => !prev)}
        >
          <BookmarkSimple
            size={18}
            weight={bookmarked ? "fill" : "bold"}
            color={bookmarked ? "#ffd400" : "#2b3b55"}
          />
        </button>
      </div>

      <h4 className={cardStyles.quizTitle}>{quiz.title}</h4>

      <div className={cardStyles.quizInfo}>
        <div className={cardStyles.quizMeta}>
          <div className={cardStyles.quizMetaItem}>
            <span className={cardStyles.metaIcon} aria-hidden="true">
              <ListChecks size={12} weight="bold" />
            </span>
            <span>
              {questionCount} câu
              <br />
              {minutes !== null ? `${minutes} phút` : "— phút"}
            </span>
          </div>
          <div className={cardStyles.quizMetaItem}>
            <span className={cardStyles.metaIcon} aria-hidden="true">
              <Clock size={12} weight="bold" />
            </span>
            <span>{quiz.isChallenge ? "Challenge" : "Quiz"}</span>
          </div>
        </div>

        <div className={cardStyles.badgeStack}>
          <DifficultyBadge difficulty={quiz.difficulty} />
          <SubjectBadge name={primarySubject.name} slug={primarySubject.slug} />
        </div>
      </div>

      <div className={cardStyles.actions}>
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
        {canArchive ? (
          <button
            type="button"
            className={`${cardStyles.btn} ${cardStyles.btnYellow} ${
              busy ? cardStyles.btnDisabled : ""
            }`}
            disabled={busy}
            onClick={archiveQuiz}
          >
            {archiving ? "Đang lưu trữ..." : "Lưu trữ"}
          </button>
        ) : null}
        {isArchived ? (
          <button
            type="button"
            className={`${cardStyles.btn} ${cardStyles.btnYellow} ${
              busy ? cardStyles.btnDisabled : ""
            }`}
            disabled={busy}
            onClick={restoreQuiz}
          >
            {restoring ? "Đang khôi phục..." : "Khôi phục"}
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
          {mutationError.code === "QUIZ_HAS_ATTEMPTS" ? (
            <div>
              {isArchived
                ? "Quiz đã có lượt thi. Không thể xóa."
                : "Quiz đã có lượt thi. Hãy lưu trữ thay vì xóa."}
              <div className={cardStyles.cardErrorActions}>
                {!isArchived ? (
                  <button
                    type="button"
                    className={`${cardStyles.btn} ${cardStyles.btnYellow} ${
                      busy ? cardStyles.btnDisabled : ""
                    }`}
                    disabled={busy}
                    onClick={archiveQuiz}
                  >
                    {archiving ? "Đang lưu trữ..." : "Lưu trữ"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${cardStyles.btn} ${cardStyles.btnBlue}`}
                  onClick={() => setMutationError(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <div>
              {mutationError.message}
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
          )}
        </div>
      ) : null}
    </article>
  );
}
