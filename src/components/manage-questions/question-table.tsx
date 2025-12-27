"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Question, QuestionType } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatDateVi } from "@/lib/formatters";
import styles from "./question-table.module.css";

type QuestionTableProps = {
  items: Question[];
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onMutated: () => void;
};

type RowError = { questionId: string; message: string } | null;

export function QuestionTable({
  items,
  subjects,
  isLoading,
  error,
  onRetry,
  onMutated,
}: QuestionTableProps) {
  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  const [mutating, setMutating] = useState<{
    questionId: string;
    action: "archive" | "restore" | "delete";
  } | null>(null);
  const [rowError, setRowError] = useState<RowError>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );

  const patchStatus = async (
    questionId: string,
    status: "active" | "archived",
  ) => {
    setRowError(null);
    setMutating({
      questionId,
      action: status === "archived" ? "archive" : "restore",
    });
    try {
      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể cập nhật câu hỏi");
      }
      onMutated();
    } catch (err) {
      setRowError({
        questionId,
        message:
          err instanceof Error ? err.message : "Không thể cập nhật câu hỏi",
      });
    } finally {
      setMutating(null);
    }
  };

  const deleteQuestionConfirmed = async (questionId: string) => {
    setRowError(null);
    setMutating({ questionId, action: "delete" });
    try {
      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xóa câu hỏi");
      }
      onMutated();
    } catch (err) {
      setRowError({
        questionId,
        message: err instanceof Error ? err.message : "Không thể xóa câu hỏi",
      });
    } finally {
      setMutating(null);
    }
  };

  const requestDeleteQuestion = (questionId: string) => {
    setDeleteCandidateId(questionId);
  };

  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button
            className={styles.stateAction}
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.stateCard} aria-live="polite">
        {isLoading ? "Đang tải câu hỏi..." : "Không có câu hỏi phù hợp."}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} aria-busy={isLoading}>
      <table className={styles.table} aria-label="Danh sách câu hỏi">
        <thead>
          <tr>
            <th scope="col">Nội dung</th>
            <th scope="col">Môn</th>
            <th scope="col">Loại</th>
            <th scope="col">Độ khó</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Cập nhật</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => {
            const subject = subjectMap.get(q.subjectId);
            const rowBusy = mutating?.questionId === q.id;
            const busy = rowBusy ? mutating?.action : null;
            const dateLabel = formatDateVi(q.updatedAt ?? q.createdAt);
            const editHref = q.passageId
              ? {
                  pathname: `/staff/questions/passages/${q.passageId}`,
                  query: { questionId: q.id },
                }
              : { pathname: `/staff/questions/${q.id}` };
            return (
              <tr key={q.id}>
                <td className={styles.stem}>{q.stem}</td>
                <td>{subject?.name ?? "—"}</td>
                <td>
                  <span className={`${styles.pill} ${styles.pillGray}`}>
                    {questionTypeLabel(q.type)}
                  </span>
                </td>
                <td>
                  <span className={`${styles.pill} ${styles.pillBlue}`}>
                    {q.defaultDifficulty} ★
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.pill} ${
                      q.status === "archived"
                        ? styles.pillGray
                        : styles.pillBlue
                    }`}
                  >
                    {q.status === "archived" ? "Lưu trữ" : "Hoạt động"}
                  </span>
                </td>
                <td>{dateLabel}</td>
                <td>
                  <div className={styles.actions}>
                    <Link
                      className={`${styles.linkBtn} ${styles.linkBtnBlue}`}
                      href={editHref}
                    >
                      Sửa
                    </Link>
                    {q.status === "archived" ? (
                      <button
                        type="button"
                        className={`${styles.linkBtn} ${
                          rowBusy ? styles.linkBtnDisabled : ""
                        }`}
                        disabled={rowBusy}
                        onClick={() => patchStatus(q.id, "active")}
                      >
                        {busy === "restore" ? "Đang khôi phục..." : "Khôi phục"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.linkBtn} ${
                          rowBusy ? styles.linkBtnDisabled : ""
                        }`}
                        disabled={rowBusy}
                        onClick={() => patchStatus(q.id, "archived")}
                      >
                        {busy === "archive" ? "Đang lưu trữ..." : "Lưu trữ"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.linkBtn} ${styles.linkBtnRed} ${
                        rowBusy ? styles.linkBtnDisabled : ""
                      }`}
                      disabled={rowBusy}
                      onClick={() => requestDeleteQuestion(q.id)}
                    >
                      {busy === "delete" ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                  {rowError?.questionId === q.id ? (
                    <div className={styles.meta} role="alert">
                      {rowError.message}
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmModal
        open={deleteCandidateId !== null}
        title="Xóa câu hỏi?"
        message="Xóa câu hỏi này? Nếu câu hỏi đang được dùng trong quiz, bạn sẽ không thể xóa."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        confirmVariant="danger"
        disableConfirm={mutating !== null}
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={() => {
          const targetId = deleteCandidateId;
          setDeleteCandidateId(null);
          if (!targetId) return;
          void deleteQuestionConfirmed(targetId);
        }}
      />
    </div>
  );
}

function questionTypeLabel(type: QuestionType) {
  switch (type) {
    case "mcq_single":
      return "MCQ 1";
    case "mcq_multi":
      return "MCQ N";
    case "short_answer":
      return "Tự luận";
    default:
      return type;
  }
}
