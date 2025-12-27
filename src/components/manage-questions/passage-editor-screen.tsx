"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type {
  Passage,
  Question,
  QuestionDetail,
} from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { RichText } from "@/components/ui/rich-text";
import { formatDateVi } from "@/lib/formatters";
import styles from "./passage-editor-screen.module.css";
import editorStyles from "./question-editor-screen.module.css";
import { QuestionPreview } from "./question-preview";
import tableStyles from "./question-table.module.css";

type PassageDetail = { passage: Passage; questions: Question[] };

type PassageEditorScreenProps = {
  session: SessionPayload;
  subjects: Subject[];
  passageId: string;
  initialDetail: PassageDetail;
};

type OptionDraft = {
  label: string | null;
  text: string;
  isCorrect: boolean;
  position: number;
};

type AnswerDraft = {
  clientId: string;
  acceptableAnswer: string;
  caseSensitive: boolean;
};

type ViewMode = "edit" | "split" | "preview";

export function PassageEditorScreen({
  session,
  subjects,
  passageId,
  initialDetail,
}: PassageEditorScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = session.fullName ?? session.email.split("@")[0];

  const [passage, setPassage] = useState<Passage>(initialDetail.passage);
  const [questions, setQuestions] = useState<Question[]>(
    initialDetail.questions,
  );

  const [passageContent, setPassageContent] = useState(passage.content);
  const [passageMedia, setPassageMedia] = useState(
    (passage.mediaUrls ?? []).join("\n"),
  );
  const [passageViewMode, setPassageViewMode] = useState<ViewMode>("edit");
  const [passageSaving, setPassageSaving] = useState(false);
  const [passageError, setPassageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const didInitExpandedRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    const nextMedia = passageMedia
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (nextContent !== passage.content) return true;
    if ((passage.mediaUrls ?? []).join("\n") !== nextMedia.join("\n"))
      return true;
    return false;
  }, [passage.content, passage.mediaUrls, passageContent, passageMedia]);

  useEffect(() => {
    setPassageContent(passage.content);
    setPassageMedia((passage.mediaUrls ?? []).join("\n"));
  }, [passage.content, passage.mediaUrls]);

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
      setPassageError("Đoạn văn không được để trống.");
      return;
    }
    const mediaUrls = passageMedia
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      setPassageSaving(true);
      const response = await fetch(`/api/staff/passages/${passageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, mediaUrls }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể lưu đoạn văn");
      }
      const payload = (await response.json()) as { passage?: Passage };
      if (!payload.passage) throw new Error("Không thể lưu đoạn văn");
      setPassage(payload.passage);
      setNotice("Đã lưu đoạn văn.");
    } catch (err) {
      setPassageError(
        err instanceof Error ? err.message : "Không thể lưu đoạn văn",
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
        throw new Error(payload?.error ?? "Không thể xóa/lưu trữ câu hỏi");
      }

      const payload = (await response.json().catch(() => ({}))) as
        | { status?: "archived" | "deleted"; code?: string }
        | undefined;

      const status = payload?.status ?? "deleted";
      if (status === "archived") {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === deleteTarget.id ? { ...q, status: "archived" } : q,
          ),
        );
        setNotice("Câu hỏi đang được dùng → đã lưu trữ thay vì xóa.");
        setDeleteTarget(null);
        return;
      }

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
        err instanceof Error ? err.message : "Không thể xóa/lưu trữ câu hỏi",
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
            <h1 className={styles.heroTitle}>Chỉnh sửa passage</h1>
            <p className={styles.heroSub}>ID: {passageId}</p>
            <p className={styles.heroText}>
              Chỉnh sửa đoạn văn và các câu hỏi liên quan trong cùng nhóm.
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
              className={`${styles.btn} ${styles.btnBlue} ${
                passageSaving || !passageDirty ? styles.btnDisabled : ""
              }`}
              disabled={passageSaving || !passageDirty}
              onClick={savePassage}
            >
              {passageSaving ? "Đang lưu..." : "Lưu đoạn văn"}
            </button>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Passage">
          <h2 className={styles.sectionTitle}>Đoạn văn</h2>
          <p className={styles.sectionSub}>
            Đoạn văn này được dùng chung cho các câu hỏi bên dưới.
          </p>
          <div
            className={editorStyles.row}
            style={{ justifyContent: "space-between", marginTop: 10 }}
          >
            <div className={editorStyles.muted}>
              Xem trước hỗ trợ Markdown + LaTeX.
            </div>
            <div
              className={editorStyles.row}
              role="tablist"
              aria-label="Chế độ"
            >
              <button
                type="button"
                role="tab"
                aria-selected={passageViewMode === "edit"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "edit" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("edit")}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={passageViewMode === "split"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "split" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("split")}
              >
                Chia đôi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={passageViewMode === "preview"}
                className={`${editorStyles.smallBtn} ${
                  passageViewMode === "preview" ? editorStyles.smallBtnBlue : ""
                }`}
                onClick={() => setPassageViewMode("preview")}
              >
                Xem trước
              </button>
            </div>
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
                      Chưa có nội dung đoạn văn để xem trước.
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
                      placeholder="Nội dung đoạn văn..."
                      disabled={passageSaving}
                    />
                  </div>

                  <div className={styles.fullRow}>
                    <div className={editorStyles.row}>
                      <div className={editorStyles.label}>Media URLs</div>
                      <span className={editorStyles.muted}>
                        (mỗi dòng 1 URL)
                      </span>
                    </div>
                    <textarea
                      className={`${editorStyles.textarea} ${editorStyles.textareaSmall}`}
                      value={passageMedia}
                      onChange={(e) => setPassageMedia(e.target.value)}
                      placeholder="https://..."
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
                        Chưa có nội dung đoạn văn để xem trước.
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
              <h2 className={styles.sectionTitle}>Câu hỏi trong passage</h2>
              <div className={styles.subtle}>{questionCountLabel}</div>
            </div>
            <div className={styles.subtle}>
              Tip: bấm “Mở” để chỉnh sửa nhanh từng câu hỏi.
            </div>
          </div>

          {!questions.length ? (
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
                      return (
                        <Fragment key={q.id}>
                          <tr key={q.id}>
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
                                  className={`${tableStyles.linkBtn} ${tableStyles.linkBtnBlue}`}
                                  onClick={() => toggleExpanded(q.id)}
                                >
                                  {open ? "Đóng" : "Mở"}
                                </button>
                                <button
                                  type="button"
                                  className={`${tableStyles.linkBtn} ${tableStyles.linkBtnRed}`}
                                  onClick={() => handleRequestDelete(q)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open ? (
                            <tr key={`${q.id}-editor`}>
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
    </StaffShell>
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
  const [tagsText, setTagsText] = useState<string>(
    (initialQuestion.tags ?? []).join(", "),
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
    setTagsText((q.tags ?? []).join(", "));
    setStatus(q.status ?? "active");
    setOptions(normalizeOptionDrafts(detail.options));
    setShortAnswers(normalizeShortAnswerDrafts(detail.shortAnswerKeys));
  }, [detail]);

  const disabled = loading || saving;
  const isMcq = type === "mcq_single" || type === "mcq_multi";
  const isMultiCorrect = type === "mcq_multi";

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
        tags: parseTags(tagsText),
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
        Đoạn văn được chỉnh sửa ở phần “Đoạn văn” phía trên.
      </div>

      <div
        className={editorStyles.row}
        style={{ justifyContent: "space-between", marginTop: 12 }}
      >
        <div className={editorStyles.muted}>
          Xem trước hỗ trợ Markdown + LaTeX.
        </div>
        <div className={editorStyles.row} role="tablist" aria-label="Chế độ">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "edit"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "edit" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("edit")}
          >
            Soạn thảo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "split"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "split" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("split")}
          >
            Chia đôi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "preview"}
            className={`${editorStyles.smallBtn} ${
              viewMode === "preview" ? editorStyles.smallBtnBlue : ""
            }`}
            onClick={() => setViewMode("preview")}
          >
            Xem trước
          </button>
        </div>
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
                  <div className={editorStyles.label}>Tags</div>
                  <span className={editorStyles.muted}>
                    (cách nhau bởi dấu phẩy)
                  </span>
                </div>
                <input
                  className={editorStyles.input}
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="vd: ngữ pháp, đại số, ..."
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
      >
        <h2 className={styles.modalTitle}>{title}</h2>
        <div className={styles.modalBody}>
          <div>
            <strong>Nội dung:</strong> {subtitle || "—"}
          </div>
          <ul>
            <li>
              Nếu câu hỏi đang được dùng trong quiz, hệ thống sẽ{" "}
              <strong>lưu trữ</strong> thay vì xóa.
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

function buildDefaultMcqOptions(): OptionDraft[] {
  return [
    { label: null, text: "", isCorrect: false, position: 1 },
    { label: null, text: "", isCorrect: false, position: 2 },
    { label: null, text: "", isCorrect: false, position: 3 },
    { label: null, text: "", isCorrect: false, position: 4 },
  ];
}

function normalizeOptionDrafts(
  options: QuestionDetail["options"],
): OptionDraft[] {
  const sorted = [...(options ?? [])].sort((a, b) => a.position - b.position);
  if (!sorted.length) return buildDefaultMcqOptions();
  return sorted.map((o) => ({
    label: o.label ?? null,
    text: o.text ?? "",
    isCorrect: Boolean(o.isCorrect),
    position: o.position,
  }));
}

function normalizeShortAnswerDrafts(
  keys: QuestionDetail["shortAnswerKeys"],
): AnswerDraft[] {
  const sorted = [...(keys ?? [])].map((k) => ({
    clientId: k.id,
    acceptableAnswer: k.acceptableAnswer ?? "",
    caseSensitive: Boolean(k.caseSensitive),
  }));
  return sorted.length ? sorted : [buildEmptyShortAnswer()];
}

function normalizeOptionsForPayload(options: OptionDraft[]) {
  const normalized = options
    .slice()
    .map((o, idx) => ({
      label: o.label ?? null,
      text: o.text.trim(),
      isCorrect: Boolean(o.isCorrect),
      position: idx + 1,
    }))
    .filter((o) => o.text);
  return normalized;
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

function parseTags(text: string): string[] {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildEmptyShortAnswer(): AnswerDraft {
  return {
    clientId: makeClientId(),
    acceptableAnswer: "",
    caseSensitive: false,
  };
}

function makeClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
