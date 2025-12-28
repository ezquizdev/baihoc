"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type {
  QuestionDetail,
  QuestionOption,
  ShortAnswerKey,
} from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
import styles from "./question-editor-screen.module.css";
import { QuestionPreview } from "./question-preview";

type QuestionEditorScreenProps =
  | {
      session: SessionPayload;
      subjects: Subject[];
      mode: "create";
      initialType?: QuestionType;
      questionId?: never;
      initialDetail?: never;
    }
  | {
      session: SessionPayload;
      subjects: Subject[];
      mode: "edit";
      questionId: string;
      initialDetail: QuestionDetail;
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

type BusyAction = "save" | "archive" | "restore" | "delete";
type ViewMode = "edit" | "split" | "preview";

export function QuestionEditorScreen(props: QuestionEditorScreenProps) {
  const router = useRouter();
  const displayName =
    props.session.fullName ?? props.session.email.split("@")[0];

  const initial = props.mode === "edit" ? props.initialDetail : null;
  const initialQuestion = initial?.question;
  const initialCreateType =
    props.mode === "create"
      ? (props.initialType ?? "mcq_single")
      : "mcq_single";

  const [subjectId, setSubjectId] = useState<string>(
    initialQuestion?.subjectId ?? props.subjects[0]?.id ?? "",
  );
  const [type, setType] = useState<QuestionType>(
    initialQuestion?.type ?? initialCreateType,
  );
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>(
    (initialQuestion?.defaultDifficulty ?? 3) as DifficultyLevel,
  );
  const [defaultScore, setDefaultScore] = useState<number>(
    initialQuestion?.defaultScore ?? 1,
  );
  const [stem, setStem] = useState<string>(initialQuestion?.stem ?? "");
  const [explanation, setExplanation] = useState<string>(
    initialQuestion?.explanation ?? "",
  );
  const [tagsText, setTagsText] = useState<string>(
    (initialQuestion?.tags ?? []).join(", "),
  );
  const [status, setStatus] = useState<"active" | "archived">(
    initialQuestion?.status ?? "active",
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [options, setOptions] = useState<OptionDraft[]>(
    initial ? normalizeOptionDrafts(initial.options) : buildDefaultMcqOptions(),
  );
  const [shortAnswers, setShortAnswers] = useState<AnswerDraft[]>(
    initial
      ? normalizeShortAnswerDrafts(initial.shortAnswerKeys)
      : [buildEmptyShortAnswer()],
  );

  const [passageEnabled, setPassageEnabled] = useState<boolean>(
    Boolean(initial?.passage),
  );
  const [passageContent, setPassageContent] = useState<string>(
    initial?.passage?.content ?? "",
  );
  const [passagePosition, setPassagePosition] = useState<number>(
    initialQuestion?.passagePosition ?? 1,
  );

  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isMcq = type === "mcq_single" || type === "mcq_multi";
  const isMultiCorrect = type === "mcq_multi";

  const canSave = useMemo(() => {
    if (!subjectId) return false;
    if (!stem.trim()) return false;
    if (!Number.isFinite(defaultDifficulty)) return false;
    if (!Number.isFinite(defaultScore) || defaultScore <= 0) return false;
    if (passageEnabled) {
      if (!passageContent.trim()) return false;
      if (!Number.isFinite(passagePosition) || passagePosition <= 0) {
        return false;
      }
    }
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
    passageContent,
    passageEnabled,
    passagePosition,
  ]);

  const title = props.mode === "create" ? "Tạo câu hỏi" : "Chỉnh sửa câu hỏi";
  const meta = props.mode === "edit" ? `ID: ${props.questionId}` : null;
  const description =
    props.mode === "create"
      ? "Tạo câu hỏi mới để đưa vào kho."
      : "Chỉnh sửa nội dung, đáp án và trạng thái.";

  const disabled = busyAction !== null;

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!canSave) {
      setError("Vui lòng điền đầy đủ thông tin và kiểm tra đáp án.");
      return;
    }

    try {
      setBusyAction("save");
      const payload: Record<string, unknown> = {
        subjectId,
        defaultDifficulty,
        type,
        stem: stem.trim(),
        explanation: explanation.trim() ? explanation.trim() : null,
        tags: parseTags(tagsText),
        defaultScore,
      };

      if (props.mode === "edit") {
        payload.status = status;
      }

      if (isMcq) {
        payload.options = normalizeOptionsForPayload(options);
        if (props.mode === "edit") {
          payload.shortAnswers = null;
        }
      } else if (type === "short_answer") {
        payload.shortAnswers = shortAnswers
          .map((a) => ({
            acceptableAnswer: a.acceptableAnswer.trim(),
            caseSensitive: Boolean(a.caseSensitive),
          }))
          .filter((a) => a.acceptableAnswer);
        if (props.mode === "edit") {
          payload.options = null;
        }
      }

      if (passageEnabled) {
        const content = passageContent.trim();
        if (!content) {
          throw new Error("Đoạn văn không được để trống.");
        }
        payload.passage = {
          content,
        };
        payload.passagePosition = Math.max(
          1,
          Number.isFinite(passagePosition) ? Math.round(passagePosition) : 1,
        );
      } else if (props.mode === "edit") {
        payload.passage = null;
      }

      const response = await fetch(
        props.mode === "create"
          ? "/api/staff/questions"
          : `/api/staff/questions/${props.questionId}`,
        {
          method: props.mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể lưu câu hỏi");
      }
      const data = await response.json();
      const next = data.question as QuestionDetail | undefined;
      if (!next) throw new Error("Không thể lưu câu hỏi");

      if (props.mode === "create") {
        router.push(`/staff/questions/${next.question.id}`);
        router.refresh();
        return;
      }

      setStatus(next.question.status);

      if (next.question.passageId) {
        router.push(
          `/staff/questions/passages/${next.question.passageId}?questionId=${props.questionId}`,
        );
        router.refresh();
        return;
      }

      setNotice("Đã lưu thay đổi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu câu hỏi");
    } finally {
      setBusyAction(null);
    }
  };

  const mutateStatus = async (nextStatus: "active" | "archived") => {
    if (props.mode !== "edit") return;
    setError(null);
    setNotice(null);
    try {
      setBusyAction(nextStatus === "archived" ? "archive" : "restore");
      const response = await fetch(`/api/staff/questions/${props.questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể cập nhật trạng thái");
      }
      setStatus(nextStatus);
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
      setBusyAction(null);
    }
  };

  const doDelete = () => {
    if (props.mode !== "edit") return;
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (props.mode !== "edit") return;
    if (busyAction) return;
    setError(null);
    setNotice(null);
    setDeleteError(null);
    try {
      setBusyAction("delete");
      const response = await fetch(`/api/staff/questions/${props.questionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể xóa câu hỏi");
      }
      router.push("/staff/questions");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Không thể xóa câu hỏi",
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <StaffShell
      activeNav="questions"
      userEmail={props.session.email}
      userName={displayName}
      avatarUrl={props.session.avatarUrl}
      searchDisabled
      searchPlaceholder="Tìm câu hỏi"
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>{title}</h1>
            {meta ? <p className={styles.heroSub}>{meta}</p> : null}
            <p className={styles.heroText}>{description}</p>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href="/staff/questions"
            >
              Quay lại
            </Link>
            {props.mode === "edit" ? (
              status === "archived" ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGray} ${
                    disabled ? styles.btnDisabled : ""
                  }`}
                  disabled={disabled}
                  onClick={() => mutateStatus("active")}
                >
                  {busyAction === "restore" ? "Đang khôi phục..." : "Khôi phục"}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGray} ${
                    disabled ? styles.btnDisabled : ""
                  }`}
                  disabled={disabled}
                  onClick={() => mutateStatus("archived")}
                >
                  {busyAction === "archive" ? "Lưu trữ" : "Lưu trữ"}
                </button>
              )
            ) : null}
            {props.mode === "edit" ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnRed} ${
                  disabled ? styles.btnDisabled : ""
                }`}
                disabled={disabled}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Xóa
              </button>
            ) : null}
            <button
              type="button"
              className={`${styles.btn} ${styles.btnBlue} ${
                disabled || !canSave ? styles.btnDisabled : ""
              }`}
              disabled={disabled || !canSave}
              onClick={submit}
            >
              {busyAction === "save" ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </section>

        <ConfirmModal
          open={deleteConfirmOpen}
          title="Xóa câu hỏi?"
          message="Xóa câu hỏi này? Nếu câu hỏi đang được dùng trong quiz, bạn sẽ không thể xóa."
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          confirmVariant="danger"
          disableConfirm={disabled}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            void doDelete();
          }}
        />

        <section className={`cardBase ${styles.card}`} aria-label="Editor">
          <div
            className={styles.row}
            style={{ justifyContent: "space-between", marginBottom: 14 }}
          >
            <div>
              <div className={styles.muted}>
                Xem trước hỗ trợ Markdown + LaTeX.
              </div>
              <div className={styles.muted} aria-live="polite">
                {mediaUploadingCount > 0
                  ? `Đang upload ${mediaUploadingCount} ảnh...`
                  : "Tip: Dán ảnh (Ctrl/Cmd+V) để tự upload và chèn ảnh vào nội dung."}
              </div>
              {mediaUploadError ? (
                <div
                  className={styles.inlineError}
                  role="alert"
                  style={{ marginTop: 10 }}
                >
                  {mediaUploadError}
                </div>
              ) : null}
            </div>
            <fieldset
              className={`${styles.row} ${styles.toggleGroup}`}
              aria-label="Chế độ"
            >
              <button
                type="button"
                aria-pressed={viewMode === "edit"}
                className={`${styles.smallBtn} ${
                  viewMode === "edit" ? styles.smallBtnBlue : ""
                }`}
                onClick={() => setViewMode("edit")}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "split"}
                className={`${styles.smallBtn} ${
                  viewMode === "split" ? styles.smallBtnBlue : ""
                }`}
                onClick={() => setViewMode("split")}
              >
                Chia đôi
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "preview"}
                className={`${styles.smallBtn} ${
                  viewMode === "preview" ? styles.smallBtnBlue : ""
                }`}
                onClick={() => setViewMode("preview")}
              >
                Xem trước
              </button>
            </fieldset>
          </div>

          {viewMode === "preview" ? (
            <QuestionPreview
              passageContent={passageEnabled ? passageContent : null}
              stem={stem}
              explanation={explanation}
              type={type}
              options={options}
              shortAnswers={shortAnswers}
            />
          ) : (
            <div
              className={viewMode === "split" ? styles.splitLayout : undefined}
            >
              <div>
                <div className={styles.grid}>
                  <div className={styles.stack}>
                    <div className={styles.row}>
                      <div className={styles.label}>Môn học</div>
                    </div>
                    <select
                      className={styles.select}
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      disabled={disabled}
                    >
                      <option value="" disabled>
                        Chọn môn học...
                      </option>
                      {props.subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <div className={styles.row}>
                      <div className={styles.label}>Loại câu hỏi</div>
                    </div>
                    <select
                      className={styles.select}
                      value={type}
                      onChange={(e) => setType(e.target.value as QuestionType)}
                      disabled={disabled}
                    >
                      <option value="mcq_single">MCQ (1 đáp án)</option>
                      <option value="mcq_multi">MCQ (nhiều đáp án)</option>
                      <option value="short_answer">Tự luận ngắn</option>
                    </select>

                    <div className={styles.row}>
                      <div className={styles.label}>Độ khó</div>
                    </div>
                    <div className={styles.row}>
                      {[5, 4, 3, 2, 1].map((lvl) => (
                        <label key={lvl} className={styles.smallBtn}>
                          <input
                            type="radio"
                            name="difficulty"
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

                    <div className={styles.row}>
                      <div className={styles.label}>Điểm mặc định</div>
                    </div>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={defaultScore}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setDefaultScore(Number.isFinite(next) ? next : 1);
                      }}
                      disabled={disabled}
                    />

                    <div className={styles.row}>
                      <div className={styles.label}>Tags</div>
                      <span className={styles.muted}>
                        (cách nhau bởi dấu phẩy)
                      </span>
                    </div>
                    <input
                      className={styles.input}
                      value={tagsText}
                      onChange={(e) => setTagsText(e.target.value)}
                      placeholder="vd: ngữ pháp, đại số, ..."
                      disabled={disabled}
                    />

                    {props.mode === "edit" ? (
                      <>
                        <div className={styles.row}>
                          <div className={styles.label}>Trạng thái</div>
                        </div>
                        <select
                          className={styles.select}
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as "active" | "archived")
                          }
                          disabled={disabled}
                        >
                          <option value="active">Hoạt động</option>
                          <option value="archived">Lưu trữ</option>
                        </select>
                      </>
                    ) : null}
                  </div>

                  <div className={styles.stack}>
                    <div className={styles.row}>
                      <div className={styles.label}>Nội dung câu hỏi</div>
                    </div>
                    <textarea
                      className={styles.textarea}
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

                    <div className={styles.row}>
                      <div className={styles.label}>Giải thích (tuỳ chọn)</div>
                    </div>
                    <textarea
                      className={`${styles.textarea} ${styles.textareaSmall}`}
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

                <div className={styles.stack} style={{ marginTop: 16 }}>
                  <h3 className={styles.sectionTitle}>
                    {isMcq ? "Đáp án (MCQ)" : "Đáp án (Tự luận ngắn)"}
                  </h3>

                  {isMcq ? (
                    <>
                      <div className={styles.muted}>
                        {isMultiCorrect
                          ? "Chọn một hoặc nhiều đáp án đúng."
                          : "Chọn đúng 1 đáp án."}
                      </div>
                      {options.map((opt, idx) => (
                        <div key={opt.position} className={styles.optionRow}>
                          <input
                            className={styles.input}
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
                            className={`${styles.smallBtn} ${styles.smallBtnBlue}`}
                            onClick={() =>
                              pickCorrect(idx, isMultiCorrect, setOptions)
                            }
                            disabled={disabled}
                          >
                            {opt.isCorrect ? "Đúng ✓" : "Chọn đúng"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.smallBtn} ${styles.smallBtnRed}`}
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
                      <div className={styles.row}>
                        <button
                          type="button"
                          className={`${styles.smallBtn} ${styles.smallBtnBlue}`}
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
                        <div key={ans.clientId} className={styles.optionRow}>
                          <input
                            className={styles.input}
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
                          <label className={styles.smallBtn}>
                            <input
                              type="checkbox"
                              checked={ans.caseSensitive}
                              onChange={() =>
                                setShortAnswers((prev) =>
                                  prev.map((a, ai) =>
                                    ai === idx
                                      ? {
                                          ...a,
                                          caseSensitive: !a.caseSensitive,
                                        }
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
                            className={`${styles.smallBtn} ${styles.smallBtnRed}`}
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
                      <div className={styles.row}>
                        <button
                          type="button"
                          className={`${styles.smallBtn} ${styles.smallBtnBlue}`}
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

                <div className={styles.stack} style={{ marginTop: 16 }}>
                  <h3 className={styles.sectionTitle}>Đoạn văn (tuỳ chọn)</h3>
                  <label className={styles.smallBtn}>
                    <input
                      type="checkbox"
                      checked={passageEnabled}
                      onChange={() => setPassageEnabled((prev) => !prev)}
                      disabled={disabled}
                    />{" "}
                    Kèm đoạn văn
                  </label>
                  {passageEnabled ? (
                    <>
                      <textarea
                        className={`${styles.textarea} ${styles.textareaSmall}`}
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
                        placeholder="Nội dung đoạn văn..."
                        disabled={disabled}
                      />
                      <div className={styles.row}>
                        <div className={styles.label}>Vị trí trong passage</div>
                        <input
                          className={styles.input}
                          type="number"
                          min={1}
                          value={passagePosition}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setPassagePosition(
                              Number.isFinite(next) ? next : 1,
                            );
                          }}
                          disabled={disabled}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              {viewMode === "split" ? (
                <QuestionPreview
                  passageContent={passageEnabled ? passageContent : null}
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
              className={styles.inlineError}
              role="alert"
              style={{ marginTop: 14 }}
            >
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className={styles.muted} style={{ marginTop: 10 }}>
              {notice}
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmDeleteModal
        open={deleteOpen}
        deleting={busyAction === "delete"}
        error={deleteError}
        title="Xóa câu hỏi?"
        questionStem={stem}
        hasPassage={passageEnabled}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (busyAction === "delete") return;
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      />
    </StaffShell>
  );
}

function buildDefaultMcqOptions(): OptionDraft[] {
  return [
    { label: null, text: "", isCorrect: false, position: 1 },
    { label: null, text: "", isCorrect: false, position: 2 },
    { label: null, text: "", isCorrect: false, position: 3 },
    { label: null, text: "", isCorrect: false, position: 4 },
  ];
}

function normalizeOptionDrafts(options: QuestionOption[]): OptionDraft[] {
  const sorted = [...(options ?? [])].sort((a, b) => a.position - b.position);
  if (!sorted.length) return buildDefaultMcqOptions();
  return sorted.map((o) => ({
    label: o.label ?? null,
    text: o.text ?? "",
    isCorrect: Boolean(o.isCorrect),
    position: o.position,
  }));
}

function normalizeShortAnswerDrafts(keys: ShortAnswerKey[]): AnswerDraft[] {
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

function ConfirmDeleteModal({
  open,
  deleting,
  error,
  title,
  questionStem,
  hasPassage,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  deleting: boolean;
  error: string | null;
  title: string;
  questionStem: string;
  hasPassage: boolean;
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
            {hasPassage ? (
              <li>
                Câu hỏi có đoạn văn đính kèm; nếu đoạn văn không còn được dùng,
                hệ thống cũng sẽ xóa đoạn văn.
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
            className={`${styles.modalSecondary} ${
              deleting ? styles.modalDisabled : ""
            }`}
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
