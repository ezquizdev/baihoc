"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type {
  Passage,
  Question,
  QuestionDetail,
} from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import {
  deletePassageConversionDraft,
  type PassageConversionDraftV1,
  readPassageConversionDraft,
} from "@/components/manage-questions/passage-conversion-draft";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
import { RichText } from "@/components/ui/rich-text";
import { formatDateVi } from "@/lib/formatters";
import styles from "./passage-editor-screen.module.css";
import {
  type AnswerDraft,
  buildDefaultMcqOptions,
  buildEmptyShortAnswer,
  normalizeOptionDrafts,
  normalizeOptionsForPayload,
  normalizeShortAnswerDrafts,
  type OptionDraft,
} from "./question-draft";
import editorStyles from "./question-editor-screen.module.css";
import { QuestionInlineConvertToPassage } from "./question-inline-convert";
import { QuestionInlineCreate } from "./question-inline-create";
import { QuestionPreview } from "./question-preview";
import tableStyles from "./question-table.module.css";
import { TopicPicker } from "./topic-picker";

type PassageDetail = { passage: Passage; questions: Question[] };

type PassageEditorScreenProps = {
  session: SessionPayload;
  subjects: Subject[];
  passageId: string;
  initialDetail: PassageDetail;
  convert?:
    | {
        questionId: string;
        initialQuestionDetail: QuestionDetail;
        draftId?: string;
      }
    | null;
};

type ViewMode = "edit" | "split" | "preview";

export function PassageEditorScreen({
  session,
  subjects,
  passageId,
  initialDetail,
  convert = null,
}: PassageEditorScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = session.fullName ?? session.email.split("@")[0];

  const [passage, setPassage] = useState<Passage>(initialDetail.passage);
  const [questions, setQuestions] = useState<Question[]>(
    initialDetail.questions,
  );

  const [passageContent, setPassageContent] = useState(passage.content);
  const [passageViewMode, setPassageViewMode] = useState<ViewMode>("edit");
  const [passageSaving, setPassageSaving] = useState(false);
  const [passageError, setPassageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const didInitExpandedRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);

  const [deletePassageOpen, setDeletePassageOpen] = useState(false);
  const [deletePassageError, setDeletePassageError] = useState<string | null>(
    null,
  );
  const [deletePassageBusy, setDeletePassageBusy] = useState(false);

  const [convertDraft, setConvertDraft] = useState<PassageConversionDraftV1 | null>(
    null,
  );

  useEffect(() => {
    if (!convert?.draftId) return;
    try {
      const next = readPassageConversionDraft(convert.draftId);
      if (!next) return;
      if (next.sourceQuestionId !== convert.questionId) {
        deletePassageConversionDraft(convert.draftId);
        return;
      }
      setConvertDraft(next);
    } catch {
      // ignore (draft is optional)
    }
  }, [convert?.draftId, convert?.questionId]);

  const refreshDetail = async (): Promise<{ found: boolean }> => {
    const response = await fetch(`/api/staff/passages/${passageId}`);
    if (response.status === 404) {
      return { found: false };
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error ?? "Không thể tải passage");
    }
    const payload = (await response.json()) as Partial<PassageDetail> | null;
    if (!payload?.passage) {
      throw new Error("Không thể tải passage");
    }
    setPassage(payload.passage);
    setQuestions(payload.questions ?? []);
    return { found: true };
  };

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [subjects]);

  const passageDirty = useMemo(() => {
    const nextContent = passageContent.trim();
    if (nextContent !== passage.content) return true;
    return false;
  }, [passage.content, passageContent]);

  useEffect(() => {
    setPassageContent(passage.content);
  }, [passage.content]);

  useEffect(() => {
    if (didInitExpandedRef.current) return;
    didInitExpandedRef.current = true;
    const focusQuestionId = searchParams.get("questionId");
    if (!focusQuestionId) return;
    setExpanded(new Set([focusQuestionId]));
  }, [searchParams]);

  const savePassage = async () => {
    setPassageError(null);
    setNotice(null);
    const content = passageContent.trim();
    if (!content) {
      setPassageError("Đoạn ngữ liệu không được để trống.");
      return;
    }

    try {
      setPassageSaving(true);
      const response = await fetch(`/api/staff/passages/${passageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể lưu đoạn ngữ liệu");
      }
      const payload = (await response.json()) as { passage?: Passage };
      if (!payload.passage) throw new Error("Không thể lưu đoạn ngữ liệu");
      setPassage(payload.passage);
      setNotice("Đã lưu đoạn ngữ liệu.");
    } catch (err) {
      setPassageError(
        err instanceof Error ? err.message : "Không thể lưu đoạn ngữ liệu",
      );
    } finally {
      setPassageSaving(false);
    }
  };

  const toggleExpanded = (questionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleQuestionSaved = (detail: QuestionDetail) => {
    setNotice("Đã lưu câu hỏi.");
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === detail.question.id ? { ...q, ...detail.question } : q,
      ),
    );
  };

  const handleRequestDelete = (question: Question) => {
    setDeleteError(null);
    setDeleteTarget(question);
  };

  const nextPassagePosition = useMemo(() => {
    const positions = questions
      .map((q) => q.passagePosition ?? 0)
      .filter((pos) => pos > 0);
    return positions.length ? Math.max(...positions) + 1 : 1;
  }, [questions]);

  const convertAlreadyLinked = useMemo(() => {
    if (!convert) return false;
    return questions.some((q) => q.id === convert.questionId);
  }, [convert, questions]);

  const cancelConvert = async () => {
    if (!convert) return;
    if (convert.draftId) {
      try {
        deletePassageConversionDraft(convert.draftId);
      } catch {
        // ignore
      }
    }

    try {
      const detailRes = await fetch(`/api/staff/passages/${passageId}`);
      if (detailRes.ok) {
        const payload = (await detailRes.json()) as Partial<PassageDetail> | null;
        const questionCount = payload?.questions?.length ?? 0;
        const content = payload?.passage?.content ?? "";
        if (questionCount === 0 && !content.trim()) {
          await fetch(`/api/staff/passages/${passageId}`, { method: "DELETE" });
        }
      }
    } catch {
      // ignore
    }

    router.push(`/staff/questions/${convert.questionId}`);
    router.refresh();
  };

  const handleConverted = async (detail: QuestionDetail) => {
    setNotice("Đã chuyển câu hỏi vào passage.");
    router.push(`/staff/questions/passages/${passageId}?questionId=${detail.question.id}`);
    try {
      await refreshDetail();
    } catch {
      // ignore
    }
    router.refresh();
  };

  const handleQuestionCreated = async (detail: QuestionDetail) => {
    setNotice("Đã tạo câu hỏi.");
    setCreateOpen(false);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(detail.question.id);
      return next;
    });

    try {
      const refreshed = await refreshDetail();
      if (!refreshed.found) {
        router.push("/staff/questions");
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setNotice(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/staff/questions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xóa câu hỏi");
      }
      await response.json().catch(() => ({}));

      setDeleteTarget(null);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });

      const refreshed = await refreshDetail();
      if (!refreshed.found) {
        router.push("/staff/questions");
        router.refresh();
        return;
      }
      setNotice("Đã xóa câu hỏi.");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Không thể xóa câu hỏi",
      );
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleConfirmDeletePassage = async () => {
    setDeletePassageError(null);
    setNotice(null);
    setPassageError(null);
    setDeletePassageBusy(true);
    try {
      const response = await fetch(`/api/staff/passages/${passageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xóa passage");
      }
      await response.json().catch(() => ({}));
      router.push("/staff/questions");
      router.refresh();
    } catch (err) {
      setDeletePassageError(
        err instanceof Error ? err.message : "Không thể xóa passage",
      );
    } finally {
      setDeletePassageBusy(false);
    }
  };

  const closeDeletePassageModal = () => {
    if (deletePassageBusy) return;
    setDeletePassageOpen(false);
    setDeletePassageError(null);
  };

  const questionCountLabel =
    questions.length === 0 ? "0 câu hỏi" : `${questions.length} câu hỏi`;

  const lastQuestionWarning = deleteTarget && questions.length <= 1;

  return (
    <StaffShell
      activeNav="questions"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchDisabled
      searchPlaceholder="Tìm câu hỏi"
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Chỉnh sửa đoạn ngữ liệu</h1>
            <p className={styles.heroSub}>ID: {passageId}</p>
            <p className={styles.heroText}>
              Chỉnh sửa đoạn ngữ liệu và các câu hỏi liên quan trong cùng nhóm.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href="/staff/questions"
            >
              Quay lại
            </Link>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnRed} ${
                deletePassageBusy ? styles.btnDisabled : ""
              }`}
              disabled={deletePassageBusy}
              onClick={() => setDeletePassageOpen(true)}
            >
              Xóa passage
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnBlue} ${
                passageSaving || !passageDirty ? styles.btnDisabled : ""
              }`}
              disabled={passageSaving || !passageDirty}
              onClick={savePassage}
            >
              {passageSaving ? "Đang lưu..." : "Lưu đoạn ngữ liệu"}
            </button>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Passage">
          <h2 className={styles.sectionTitle}>Đoạn ngữ liệu</h2>
          <p className={styles.sectionSub}>
            Đoạn ngữ liệu này được dùng chung cho các câu hỏi bên dưới.
          </p>
          <div
            className={editorStyles.row}
            style={{ justifyContent: "space-between", marginTop: 10 }}
          >
            <div>
              <div className={editorStyles.muted}>
                Xem trước hỗ trợ Markdown + LaTeX.
              </div>
              <div className={editorStyles.muted} aria-live="polite">
                {mediaUploadingCount > 0
                  ? `Đang upload ${mediaUploadingCount} ảnh...`
                  : "Tip: Dán ảnh (Ctrl/Cmd+V) để tự upload và chèn ảnh vào nội dung."}
              </div>
              {mediaUploadError ? (
                <div
                  className={editorStyles.inlineError}
                  role="alert"
                  style={{ marginTop: 10 }}
                >
                  {mediaUploadError}
                </div>
              ) : null}
            </div>
            <fieldset
              className={`${editorStyles.row} ${editorStyles.toggleGroup}`}
              aria-label="Chế độ"
            >
              <button
                type="button"
                aria-pressed={passageViewMode === "edit"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "edit" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("edit")}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                aria-pressed={passageViewMode === "split"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "split" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("split")}
              >
                Chia đôi
              </button>
              <button
                type="button"
                aria-pressed={passageViewMode === "preview"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "preview" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("preview")}
              >
                Xem trước
              </button>
            </fieldset>
          </div>

          {passageViewMode === "preview" ? (
            <div style={{ marginTop: 14 }}>
              <div className={editorStyles.previewPanel}>
                <h3 className={editorStyles.previewTitle}>Xem trước</h3>
                <div className={editorStyles.previewSection}>
                  <h4 className={editorStyles.previewLabel}>Nội dung</h4>
                  {passageContent.trim() ? (
                    <RichText content={passageContent} allowLinks />
                  ) : (
                    <div className={editorStyles.previewEmpty}>
                      Chưa có nội dung đoạn ngữ liệu để xem trước.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={
                passageViewMode === "split"
                  ? editorStyles.splitLayout
                  : undefined
              }
              style={
                passageViewMode === "split" ? undefined : { marginTop: 12 }
              }
            >
              <div>
                <div className={styles.grid2}>
                  <div className={styles.fullRow}>
                    <div className={editorStyles.row}>
                      <div className={editorStyles.label}>Nội dung</div>
                    </div>
                    <textarea
                      className={editorStyles.textarea}
                      value={passageContent}
                      onChange={(e) => setPassageContent(e.target.value)}
                      onPaste={(e) =>
                        handleMarkdownImagePaste(e, {
                          setValue: setPassageContent,
                          setUploadingCount: setMediaUploadingCount,
                          setUploadError: setMediaUploadError,
                          altPrefix: "passage",
                        })
                      }
                      placeholder="Nội dung đoạn ngữ liệu..."
                      disabled={passageSaving}
                    />
                  </div>
                </div>
              </div>

              {passageViewMode === "split" ? (
                <div className={editorStyles.previewPanel}>
                  <h3 className={editorStyles.previewTitle}>Xem trước</h3>
                  <div className={editorStyles.previewSection}>
                    <h4 className={editorStyles.previewLabel}>Nội dung</h4>
                    {passageContent.trim() ? (
                      <RichText content={passageContent} allowLinks />
                    ) : (
                      <div className={editorStyles.previewEmpty}>
                        Chưa có nội dung đoạn ngữ liệu để xem trước.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {passageError ? (
            <div className={styles.inlineError} role="alert">
              {passageError}
            </div>
          ) : null}

          {notice ? <div className={styles.notice}>{notice}</div> : null}
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Questions">
          <div className={styles.tableTitleRow}>
            <div>
              <h2 className={styles.sectionTitle}>Câu hỏi</h2>
              <div className={styles.subtle}>{questionCountLabel}</div>
            </div>
            <div className={styles.tableActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnBlue} ${
                  createOpen ? styles.btnDisabled : ""
                }`}
                disabled={createOpen}
                onClick={() => {
                  setNotice(null);
                  setCreateOpen(true);
                }}
              >
                + Thêm câu hỏi
              </button>
            </div>
          </div>

          <div className={styles.subtle}>
            Tip: bấm vào hàng để mở/đóng chỉnh sửa nhanh từng câu hỏi.
          </div>

          {convert && !convertAlreadyLinked ? (
            <div style={{ marginTop: 12 }}>
              <div className={styles.expandedCard}>
                <div className={styles.subtle} style={{ marginBottom: 10 }}>
                  Đang chuyển câu hỏi từ kho câu hỏi vào passage này.
                </div>
                <QuestionInlineConvertToPassage
                  subjects={subjects}
                  questionId={convert.questionId}
                  targetPassageId={passageId}
                  initialPassagePosition={nextPassagePosition}
                  initialDetail={convert.initialQuestionDetail}
                  passageContent={passageContent}
                  draft={convertDraft}
                  draftId={convert.draftId}
                  onCancel={() => void cancelConvert()}
                  onConverted={handleConverted}
                />
              </div>
            </div>
          ) : null}

          {createOpen ? (
            <div style={{ marginTop: 12 }}>
              <div className={styles.expandedCard}>
                <QuestionInlineCreate
                  subjects={subjects}
                  passageId={passageId}
                  passageContent={passageContent}
                  initialPassagePosition={nextPassagePosition}
                  initialSubjectId={questions[0]?.subjectId ?? subjects[0]?.id}
                  initialType={questions[0]?.type ?? "mcq_single"}
                  onCancel={() => setCreateOpen(false)}
                  onCreated={handleQuestionCreated}
                />
              </div>
            </div>
          ) : null}

          {!questions.length && !(convert && !convertAlreadyLinked) ? (
            <div className={tableStyles.stateCard} aria-live="polite">
              Passage này hiện không có câu hỏi nào.
            </div>
          ) : (
            <div className={tableStyles.tableWrap}>
              <table
                className={tableStyles.table}
                aria-label="Danh sách câu hỏi trong passage"
              >
                <thead>
                  <tr>
                    <th scope="col">#</th>
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
                  {questions
                    .slice()
                    .sort(
                      (a, b) =>
                        (a.passagePosition ?? 0) - (b.passagePosition ?? 0),
                    )
                    .map((q) => {
                      const subject = subjectMap.get(q.subjectId);
                      const open = expanded.has(q.id);
                      const dateLabel = formatDateVi(
                        q.updatedAt ?? q.createdAt,
                      );
                      const editorRowId = `question-${q.id}-editor`;
                      return (
                        <Fragment key={q.id}>
                          <tr
                            key={q.id}
                            className={styles.questionRow}
                            onClick={() => toggleExpanded(q.id)}
                          >
                            <td>{q.passagePosition ?? "—"}</td>
                            <td className={tableStyles.stem}>{q.stem}</td>
                            <td>{subject?.name ?? "—"}</td>
                            <td>
                              <span
                                className={`${tableStyles.pill} ${tableStyles.pillGray}`}
                              >
                                {questionTypeLabel(q.type)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${tableStyles.pill} ${tableStyles.pillBlue}`}
                              >
                                {q.defaultDifficulty} ★
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${tableStyles.pill} ${
                                  q.status === "archived"
                                    ? tableStyles.pillGray
                                    : tableStyles.pillBlue
                                }`}
                              >
                                {q.status === "archived"
                                  ? "Lưu trữ"
                                  : "Hoạt động"}
                              </span>
                            </td>
                            <td>{dateLabel}</td>
                            <td>
                              <div className={tableStyles.actions}>
                                <button
                                  type="button"
                                  className={`${tableStyles.linkBtn} ${tableStyles.linkBtnRed}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRequestDelete(q);
                                  }}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open ? (
                            <tr key={`${q.id}-editor`} id={editorRowId}>
                              <td colSpan={8} className={styles.expandedCell}>
                                <div className={styles.expandedCard}>
                                  <InlineQuestionEditor
                                    questionId={q.id}
                                    subjects={subjects}
                                    initialSummary={q}
                                    onSaved={handleQuestionSaved}
                                  />
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        deleting={deleting}
        error={deleteError}
        title="Xóa câu hỏi trong passage?"
        questionStem={deleteTarget?.stem ?? ""}
        lastQuestionWarning={Boolean(lastQuestionWarning)}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteModal}
      />

      <ConfirmDeletePassageModal
        open={deletePassageOpen}
        deleting={deletePassageBusy}
        error={deletePassageError}
        questionCount={questions.length}
        onConfirm={handleConfirmDeletePassage}
        onCancel={closeDeletePassageModal}
      />
    </StaffShell>
  );
}

function ConfirmDeletePassageModal({
  open,
  deleting,
  error,
  questionCount,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  deleting: boolean;
  error: string | null;
  questionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    confirmRef.current?.focus();
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, open]);

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

  const countLabel =
    questionCount === 1 ? "1 câu hỏi" : `${questionCount} câu hỏi`;

  return (
    <div className={styles.modal} role="presentation">
      <div
        className={styles.backdrop}
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h2 id={titleId} className={styles.modalTitle}>
          Xóa passage và toàn bộ câu hỏi?
        </h2>
        <div id={descId} className={styles.modalBody}>
          <div>
            Thao tác này sẽ xóa đoạn ngữ liệu và <strong>{countLabel}</strong> trong
            nhóm. <strong>Không thể hoàn tác</strong>.
          </div>
          <ul>
            <li>
              Nếu có câu hỏi đang được dùng trong quiz, bạn sẽ{" "}
              <strong>không thể xóa</strong>. Hãy gỡ các câu hỏi này khỏi quiz
              trước.
            </li>
            <li>
              Nếu có lượt làm đang diễn ra, hệ thống sẽ{" "}
              <strong>chặn thao tác</strong> để tránh gián đoạn người học.
            </li>
          </ul>
          {error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>
        <div className={styles.modalActions}>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.modalPrimary} ${styles.modalPrimaryDanger} ${
              deleting ? styles.modalDisabled : ""
            }`}
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Đang xử lý..." : "Xóa passage"}
          </button>
          <button
            type="button"
            className={`${styles.modalSecondary} ${deleting ? styles.modalDisabled : ""}`}
            disabled={deleting}
            onClick={onCancel}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineQuestionEditor({
  questionId,
  subjects,
  initialSummary,
  onSaved,
}: {
  questionId: string;
  subjects: Subject[];
  initialSummary: Question;
  onSaved: (detail: QuestionDetail) => void;
}) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/staff/questions/${questionId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không tìm thấy câu hỏi");
        }
        const payload = (await response.json()) as {
          question?: QuestionDetail;
        };
        if (!payload.question) throw new Error("Không tìm thấy câu hỏi");
        setDetail(payload.question);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không tìm thấy câu hỏi");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [questionId]);

  const initialQuestion = detail?.question ?? initialSummary;

  const [subjectId, setSubjectId] = useState<string>(initialQuestion.subjectId);
  const [type, setType] = useState<QuestionType>(initialQuestion.type);
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>(
    (initialQuestion.defaultDifficulty ?? 3) as DifficultyLevel,
  );
  const [defaultScore, setDefaultScore] = useState<number>(
    initialQuestion.defaultScore ?? 1,
  );
  const [stem, setStem] = useState<string>(initialQuestion.stem ?? "");
  const [explanation, setExplanation] = useState<string>(
    initialQuestion.explanation ?? "",
  );
  const [topicIds, setTopicIds] = useState<string[]>(
    initialQuestion.topicIds ?? [],
  );
  const [status, setStatus] = useState<"active" | "archived">(
    initialQuestion.status ?? "active",
  );

  const [options, setOptions] = useState<OptionDraft[]>(
    detail ? normalizeOptionDrafts(detail.options) : buildDefaultMcqOptions(),
  );
  const [shortAnswers, setShortAnswers] = useState<AnswerDraft[]>(
    detail
      ? normalizeShortAnswerDrafts(detail.shortAnswerKeys)
      : [buildEmptyShortAnswer()],
  );

  useEffect(() => {
    if (!detail) return;
    const q = detail.question;
    setSubjectId(q.subjectId);
    setType(q.type);
    setDefaultDifficulty((q.defaultDifficulty ?? 3) as DifficultyLevel);
    setDefaultScore(q.defaultScore ?? 1);
    setStem(q.stem ?? "");
    setExplanation(q.explanation ?? "");
    setTopicIds(q.topicIds ?? []);
    setStatus(q.status ?? "active");
    setOptions(normalizeOptionDrafts(detail.options));
    setShortAnswers(normalizeShortAnswerDrafts(detail.shortAnswerKeys));
  }, [detail]);

  const disabled = loading || saving;
  const isMcq = type === "mcq_single" || type === "mcq_multi";
  const isMultiCorrect = type === "mcq_multi";
  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  const canSave = useMemo(() => {
    if (!subjectId) return false;
    if (!stem.trim()) return false;
    if (!Number.isFinite(defaultDifficulty)) return false;
    if (!Number.isFinite(defaultScore) || defaultScore <= 0) return false;
    if (isMcq) {
      const trimmed = options.map((o) => o.text.trim());
      if (trimmed.length < 2) return false;
      if (trimmed.some((t) => !t)) return false;
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount <= 0) return false;
      if (!isMultiCorrect && correctCount !== 1) return false;
      return true;
    }
    if (type === "short_answer") {
      const answers = shortAnswers.map((a) => a.acceptableAnswer.trim());
      if (!answers.length) return false;
      if (answers.some((a) => !a)) return false;
      return true;
    }
    return false;
  }, [
    defaultDifficulty,
    defaultScore,
    isMcq,
    isMultiCorrect,
    options,
    shortAnswers,
    stem,
    subjectId,
    type,
  ]);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!canSave) {
      setError("Vui lòng điền đầy đủ thông tin và kiểm tra đáp án.");
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        subjectId,
        defaultDifficulty,
        type,
        stem: stem.trim(),
        explanation: explanation.trim() ? explanation.trim() : null,
        topicIds,
        defaultScore,
        status,
        options: null,
        shortAnswers: null,
      };

      if (isMcq) {
        payload.options = normalizeOptionsForPayload(options);
      } else if (type === "short_answer") {
        payload.shortAnswers = shortAnswers
          .map((a) => ({
            acceptableAnswer: a.acceptableAnswer.trim(),
            caseSensitive: Boolean(a.caseSensitive),
          }))
          .filter((a) => a.acceptableAnswer);
      }

      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể lưu câu hỏi");
      }
      const data = (await response.json()) as { question?: QuestionDetail };
      if (!data.question) throw new Error("Không thể lưu câu hỏi");
      setDetail(data.question);
      setNotice("Đã lưu thay đổi.");
      onSaved(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  const mutateStatus = async (nextStatus: "active" | "archived") => {
    setError(null);
    setNotice(null);
    try {
      setSaving(true);
      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể cập nhật trạng thái");
      }
      const data = (await response.json()) as { question?: QuestionDetail };
      if (data.question) {
        setDetail(data.question);
        onSaved(data.question);
      } else {
        setStatus(nextStatus);
      }
      setNotice(
        nextStatus === "archived"
          ? "Đã lưu trữ câu hỏi."
          : "Đã khôi phục câu hỏi.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !detail) {
    return <div className={tableStyles.stateCard}>Đang tải câu hỏi...</div>;
  }

  if (!detail && error) {
    return (
      <div className={tableStyles.stateCard} role="alert">
        {error}
      </div>
    );
  }

  const question = detail?.question ?? initialSummary;

  return (
    <div>
      <div
        className={editorStyles.row}
        style={{ justifyContent: "space-between" }}
      >
        <div className={editorStyles.label}>
          Câu hỏi #{question.passagePosition ?? "—"}
        </div>
        <div className={editorStyles.row}>
          {status === "archived" ? (
            <button
              type="button"
              className={`${editorStyles.smallBtn} ${
                disabled ? editorStyles.btnDisabled : ""
              }`}
              disabled={disabled}
              onClick={() => mutateStatus("active")}
            >
              Khôi phục
            </button>
          ) : (
            <button
              type="button"
              className={`${editorStyles.smallBtn} ${
                disabled ? editorStyles.btnDisabled : ""
              }`}
              disabled={disabled}
              onClick={() => mutateStatus("archived")}
            >
              Lưu trữ
            </button>
          )}
          <button
            type="button"
            className={`${editorStyles.smallBtn} ${editorStyles.smallBtnBlue} ${
              disabled || !canSave ? editorStyles.btnDisabled : ""
            }`}
            disabled={disabled || !canSave}
            onClick={submit}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className={editorStyles.muted} style={{ marginTop: 6 }}>
        Đoạn ngữ liệu được chỉnh sửa ở phần “Đoạn ngữ liệu” phía trên.
      </div>

      <div
        className={editorStyles.row}
        style={{ justifyContent: "space-between", marginTop: 12 }}
      >
        <div>
          <div className={editorStyles.muted}>
            Xem trước hỗ trợ Markdown + LaTeX.
          </div>
          <div className={editorStyles.muted} aria-live="polite">
            {mediaUploadingCount > 0
              ? `Đang upload ${mediaUploadingCount} ảnh...`
              : "Tip: Dán ảnh (Ctrl/Cmd+V) để tự upload và chèn ảnh vào nội dung."}
          </div>
          {mediaUploadError ? (
            <div
              className={editorStyles.inlineError}
              role="alert"
              style={{ marginTop: 10 }}
            >
              {mediaUploadError}
            </div>
          ) : null}
        </div>
        <fieldset
          className={`${editorStyles.row} ${editorStyles.toggleGroup}`}
          aria-label="Chế độ"
        >
          <button
            type="button"
            aria-pressed={viewMode === "edit"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "edit" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("edit")}
          >
            Soạn thảo
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "split"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "split" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("split")}
          >
            Chia đôi
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "preview"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "preview" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("preview")}
          >
            Xem trước
          </button>
        </fieldset>
      </div>

      {viewMode === "preview" ? (
        <div style={{ marginTop: 14 }}>
          <QuestionPreview
            passageContent={null}
            stem={stem}
            explanation={explanation}
            type={type}
            options={options}
            shortAnswers={shortAnswers}
          />
        </div>
      ) : (
        <div
          className={
            viewMode === "split" ? editorStyles.splitLayout : undefined
          }
        >
          <div>
            <div className={editorStyles.grid} style={{ marginTop: 14 }}>
              <div className={editorStyles.stack}>
                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Môn học</div>
                </div>
                <select
                  className={editorStyles.select}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={disabled}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Loại câu hỏi</div>
                </div>
                <select
                  className={editorStyles.select}
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestionType)}
                  disabled={disabled}
                >
                  <option value="mcq_single">MCQ (1 đáp án)</option>
                  <option value="mcq_multi">MCQ (nhiều đáp án)</option>
                  <option value="short_answer">Tự luận ngắn</option>
                </select>

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Độ khó</div>
                </div>
                <div className={editorStyles.row}>
                  {[5, 4, 3, 2, 1].map((lvl) => (
                    <label key={lvl} className={editorStyles.smallBtn}>
                      <input
                        type="radio"
                        name={`difficulty-${questionId}`}
                        checked={defaultDifficulty === lvl}
                        onChange={() =>
                          setDefaultDifficulty(lvl as DifficultyLevel)
                        }
                        disabled={disabled}
                      />{" "}
                      {lvl} ★
                    </label>
                  ))}
                </div>

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Điểm mặc định</div>
                </div>
                <input
                  className={editorStyles.input}
                  type="number"
                  min={1}
                  value={defaultScore}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDefaultScore(Number.isFinite(next) ? next : 1);
                  }}
                  disabled={disabled}
                />

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Chủ đề</div>
                </div>
                <TopicPicker
                  subjectId={subjectId}
                  subjectName={subjectName}
                  selectedIds={topicIds}
                  onChange={setTopicIds}
                  disabled={disabled}
                />

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Trạng thái</div>
                </div>
                <select
                  className={editorStyles.select}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "active" | "archived")
                  }
                  disabled={disabled}
                >
                  <option value="active">Hoạt động</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>

              <div className={editorStyles.stack}>
                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>Nội dung câu hỏi</div>
                </div>
                <textarea
                  className={editorStyles.textarea}
                  value={stem}
                  onChange={(e) => setStem(e.target.value)}
                  onPaste={(e) =>
                    handleMarkdownImagePaste(e, {
                      setValue: setStem,
                      setUploadingCount: setMediaUploadingCount,
                      setUploadError: setMediaUploadError,
                      altPrefix: "question",
                    })
                  }
                  placeholder="Nhập nội dung câu hỏi..."
                  disabled={disabled}
                />

                <div className={editorStyles.row}>
                  <div className={editorStyles.label}>
                    Giải thích (tuỳ chọn)
                  </div>
                </div>
                <textarea
                  className={`${editorStyles.textarea} ${editorStyles.textareaSmall}`}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  onPaste={(e) =>
                    handleMarkdownImagePaste(e, {
                      setValue: setExplanation,
                      setUploadingCount: setMediaUploadingCount,
                      setUploadError: setMediaUploadError,
                      altPrefix: "explanation",
                    })
                  }
                  placeholder="Giải thích / lời giải..."
                  disabled={disabled}
                />
              </div>
            </div>

            <div className={editorStyles.stack} style={{ marginTop: 16 }}>
              <h3 className={editorStyles.sectionTitle}>
                {isMcq ? "Đáp án (MCQ)" : "Đáp án (Tự luận ngắn)"}
              </h3>

              {isMcq ? (
                <>
                  <div className={editorStyles.muted}>
                    {isMultiCorrect
                      ? "Chọn một hoặc nhiều đáp án đúng."
                      : "Chọn đúng 1 đáp án."}
                  </div>
                  {options.map((opt, idx) => (
                    <div key={opt.position} className={editorStyles.optionRow}>
                      <input
                        className={editorStyles.input}
                        value={opt.text}
                        onChange={(e) => {
                          const nextText = e.target.value;
                          setOptions((prev) =>
                            prev.map((o, oi) =>
                              oi === idx ? { ...o, text: nextText } : o,
                            ),
                          );
                        }}
                        onPaste={(e) =>
                          handleMarkdownImagePaste(e, {
                            setValue: (next) =>
                              setOptions((prev) =>
                                prev.map((o, oi) => {
                                  if (oi !== idx) return o;
                                  const text =
                                    typeof next === "function"
                                      ? next(o.text)
                                      : next;
                                  return { ...o, text };
                                }),
                              ),
                            setUploadingCount: setMediaUploadingCount,
                            setUploadError: setMediaUploadError,
                            altPrefix: `option-${idx + 1}`,
                          })
                        }
                        placeholder={`Đáp án ${idx + 1}`}
                        disabled={disabled}
                      />
                      <button
                        type="button"
                        className={`${editorStyles.smallBtn} ${editorStyles.smallBtnBlue}`}
                        onClick={() =>
                          pickCorrect(idx, isMultiCorrect, setOptions)
                        }
                        disabled={disabled}
                      >
                        {opt.isCorrect ? "Đúng ✓" : "Chọn đúng"}
                      </button>
                      <button
                        type="button"
                        className={`${editorStyles.smallBtn} ${editorStyles.smallBtnRed}`}
                        onClick={() =>
                          setOptions((prev) =>
                            prev.length <= 2
                              ? prev
                              : prev.filter((_, oi) => oi !== idx),
                          )
                        }
                        disabled={disabled || options.length <= 2}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                  <div className={editorStyles.row}>
                    <button
                      type="button"
                      className={`${editorStyles.smallBtn} ${editorStyles.smallBtnBlue}`}
                      onClick={() =>
                        setOptions((prev) => {
                          const nextPosition =
                            prev.reduce(
                              (max, opt) => Math.max(max, opt.position),
                              0,
                            ) + 1;
                          return [
                            ...prev,
                            {
                              label: null,
                              text: "",
                              isCorrect: false,
                              position: nextPosition,
                            },
                          ];
                        })
                      }
                      disabled={disabled}
                    >
                      + Thêm đáp án
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {shortAnswers.map((ans, idx) => (
                    <div key={ans.clientId} className={editorStyles.optionRow}>
                      <input
                        className={editorStyles.input}
                        value={ans.acceptableAnswer}
                        onChange={(e) => {
                          const nextText = e.target.value;
                          setShortAnswers((prev) =>
                            prev.map((a, ai) =>
                              ai === idx
                                ? { ...a, acceptableAnswer: nextText }
                                : a,
                            ),
                          );
                        }}
                        placeholder={`Đáp án ${idx + 1}`}
                        disabled={disabled}
                      />
                      <label className={editorStyles.smallBtn}>
                        <input
                          type="checkbox"
                          checked={ans.caseSensitive}
                          onChange={() =>
                            setShortAnswers((prev) =>
                              prev.map((a, ai) =>
                                ai === idx
                                  ? { ...a, caseSensitive: !a.caseSensitive }
                                  : a,
                              ),
                            )
                          }
                          disabled={disabled}
                        />{" "}
                        Phân biệt hoa/thường
                      </label>
                      <button
                        type="button"
                        className={`${editorStyles.smallBtn} ${editorStyles.smallBtnRed}`}
                        onClick={() =>
                          setShortAnswers((prev) =>
                            prev.length <= 1
                              ? prev
                              : prev.filter((_, ai) => ai !== idx),
                          )
                        }
                        disabled={disabled || shortAnswers.length <= 1}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                  <div className={editorStyles.row}>
                    <button
                      type="button"
                      className={`${editorStyles.smallBtn} ${editorStyles.smallBtnBlue}`}
                      onClick={() =>
                        setShortAnswers((prev) => [
                          ...prev,
                          buildEmptyShortAnswer(),
                        ])
                      }
                      disabled={disabled}
                    >
                      + Thêm đáp án
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {viewMode === "split" ? (
            <QuestionPreview
              passageContent={null}
              stem={stem}
              explanation={explanation}
              type={type}
              options={options}
              shortAnswers={shortAnswers}
            />
          ) : null}
        </div>
      )}

      {error ? (
        <div
          className={editorStyles.inlineError}
          role="alert"
          style={{ marginTop: 14 }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className={editorStyles.muted} style={{ marginTop: 10 }}>
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmDeleteModal({
  open,
  deleting,
  error,
  title,
  questionStem,
  lastQuestionWarning,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  deleting: boolean;
  error: string | null;
  title: string;
  questionStem: string;
  lastQuestionWarning: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    confirmRef.current?.focus();
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, open]);

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

  const safeStem = questionStem.trim();
  const subtitle =
    safeStem.length > 140 ? `${safeStem.slice(0, 140)}…` : safeStem;

  return (
    <div className={styles.modal} role="presentation">
      <div
        className={styles.backdrop}
        onClick={deleting ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h2 id={titleId} className={styles.modalTitle}>
          {title}
        </h2>
        <div id={descId} className={styles.modalBody}>
          <div>
            <strong>Nội dung:</strong> {subtitle || "—"}
          </div>
          <ul>
            <li>
              Nếu câu hỏi đang được dùng trong quiz, bạn sẽ{" "}
              <strong>không thể xóa</strong>. (Gợi ý: dùng{" "}
              <strong>lưu trữ</strong> nếu muốn ẩn khỏi ngân hàng câu hỏi.)
            </li>
            <li>
              Nếu câu hỏi được xóa hoàn toàn, thao tác này{" "}
              <strong>không thể hoàn tác</strong>.
            </li>
            {lastQuestionWarning ? (
              <li>
                Đây là câu hỏi cuối cùng của passage → passage có thể{" "}
                <strong>biến mất</strong> sau khi xóa.
              </li>
            ) : null}
          </ul>
          {error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
        </div>
        <div className={styles.modalActions}>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.modalPrimary} ${styles.modalPrimaryDanger} ${
              deleting ? styles.modalDisabled : ""
            }`}
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Đang xử lý..." : "Xóa"}
          </button>
          <button
            type="button"
            className={`${styles.modalSecondary} ${deleting ? styles.modalDisabled : ""}`}
            disabled={deleting}
            onClick={onCancel}
          >
            Hủy
          </button>
        </div>
      </div>
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

function pickCorrect(
  index: number,
  multi: boolean,
  setOptions: (updater: (prev: OptionDraft[]) => OptionDraft[]) => void,
) {
  setOptions((prev) => {
    if (multi) {
      return prev.map((o, idx) =>
        idx === index ? { ...o, isCorrect: !o.isCorrect } : o,
      );
    }
    return prev.map((o, idx) => ({ ...o, isCorrect: idx === index }));
  });
}
