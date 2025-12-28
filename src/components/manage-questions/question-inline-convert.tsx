"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type { QuestionDetail } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import {
  deletePassageConversionDraft,
  type PassageConversionDraftV1,
} from "@/components/manage-questions/passage-conversion-draft";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
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
import { QuestionPreview } from "./question-preview";
import { TopicPicker } from "./topic-picker";

type ViewMode = "edit" | "split" | "preview";

export function QuestionInlineConvertToPassage({
  subjects,
  questionId,
  targetPassageId,
  initialPassagePosition,
  initialDetail,
  passageContent,
  draft,
  draftId,
  onCancel,
  onConverted,
}: {
  subjects: Subject[];
  questionId: string;
  targetPassageId?: string;
  initialPassagePosition: number;
  initialDetail: QuestionDetail;
  passageContent: string;
  draft: PassageConversionDraftV1 | null;
  draftId?: string;
  onCancel: () => void;
  onConverted: (detail: QuestionDetail) => void;
}) {
  const initialQuestion = initialDetail.question;

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
  const [passagePosition, setPassagePosition] = useState<number>(1);

  const [options, setOptions] = useState<OptionDraft[]>(
    normalizeOptionDrafts(initialDetail.options),
  );
  const [shortAnswers, setShortAnswers] = useState<AnswerDraft[]>(
    normalizeShortAnswerDrafts(initialDetail.shortAnswerKeys),
  );

  const didApplyDraftRef = useRef(false);
  useEffect(() => {
    if (!draft) return;
    if (didApplyDraftRef.current) return;
    if (draft.sourceQuestionId !== questionId) return;
    didApplyDraftRef.current = true;
    setSubjectId(draft.subjectId);
    setType(draft.type);
    setDefaultDifficulty(draft.defaultDifficulty);
    setDefaultScore(draft.defaultScore);
    setStem(draft.stem);
    setExplanation(draft.explanation);
    setTopicIds(draft.topicIds);
    setOptions(draft.options.length ? draft.options : buildDefaultMcqOptions());
    setShortAnswers(
      draft.shortAnswers.length
        ? draft.shortAnswers
        : [buildEmptyShortAnswer()],
    );
    setPassagePosition(
      Math.max(
        1,
        Number.isFinite(draft.passagePosition) ? draft.passagePosition : 1,
      ),
    );
  }, [draft, questionId]);

  useEffect(() => {
    if (draft) return;
    setPassagePosition(Math.max(1, initialPassagePosition));
  }, [draft, initialPassagePosition]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const isMcq = type === "mcq_single" || type === "mcq_multi";
  const isMultiCorrect = type === "mcq_multi";

  const canSave = useMemo(() => {
    if (!subjectId) return false;
    if (!stem.trim()) return false;
    if (!Number.isFinite(defaultDifficulty)) return false;
    if (!Number.isFinite(defaultScore) || defaultScore <= 0) return false;
    if (!Number.isFinite(passagePosition) || passagePosition <= 0) return false;
    if (!targetPassageId && !passageContent.trim()) return false;

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
    passageContent,
    passagePosition,
    shortAnswers,
    stem,
    subjectId,
    type,
  ]);

  const pickCorrect = (index: number) => {
    setOptions((prev) => {
      if (isMultiCorrect) {
        return prev.map((o, idx) =>
          idx === index ? { ...o, isCorrect: !o.isCorrect } : o,
        );
      }
      return prev.map((o, idx) => ({ ...o, isCorrect: idx === index }));
    });
  };

  const submit = async () => {
    setError(null);
    if (!canSave) {
      setError("Vui lòng điền đầy đủ thông tin và kiểm tra đáp án.");
      return;
    }

    try {
      setSaving(true);
      const content = passageContent.trim();

      const payload: Record<string, unknown> = {
        subjectId,
        defaultDifficulty,
        type,
        stem: stem.trim(),
        explanation: explanation.trim() ? explanation.trim() : null,
        topicIds,
        defaultScore,
        passagePosition: Math.max(
          1,
          Number.isFinite(passagePosition) ? Math.round(passagePosition) : 1,
        ),
        options: null,
        shortAnswers: null,
      };

      if (targetPassageId) {
        payload.passageId = targetPassageId;
        if (content) {
          const passageRes = await fetch(`/api/staff/passages/${targetPassageId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content }),
          });
          if (!passageRes.ok) {
            const p = await passageRes.json().catch(() => ({}));
            throw new Error(p?.error ?? "Không thể lưu đoạn ngữ liệu");
          }
        }
      } else {
        if (!content) throw new Error("Đoạn ngữ liệu không được để trống.");
        payload.passage = { content };
      }

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
        throw new Error(data?.error ?? "Không thể chuyển câu hỏi");
      }
      const data = (await response.json()) as { question?: QuestionDetail };
      if (!data.question) throw new Error("Không thể chuyển câu hỏi");

      if (draftId) {
        try {
          deletePassageConversionDraft(draftId);
        } catch {
          // ignore
        }
      }
      onConverted(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chuyển câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving;
  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  return (
    <div>
      <div
        className={editorStyles.row}
        style={{ justifyContent: "space-between" }}
      >
        <div className={editorStyles.label}>Câu hỏi</div>
        <div className={editorStyles.row}>
          <button
            type="button"
            className={`${editorStyles.smallBtn} ${
              disabled ? editorStyles.btnDisabled : ""
            }`}
            disabled={disabled}
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`${editorStyles.smallBtn} ${editorStyles.smallBtnBlue} ${
              disabled || !canSave ? editorStyles.btnDisabled : ""
            }`}
            disabled={disabled || !canSave}
            onClick={submit}
          >
            {saving ? "Đang chuyển..." : "Chuyển & lưu"}
          </button>
        </div>
      </div>

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
        <QuestionPreview
          passageContent={passageContent}
          stem={stem}
          explanation={explanation}
          type={type}
          options={options}
          shortAnswers={shortAnswers}
        />
      ) : (
        <>
          <div className={editorStyles.metaGrid} style={{ marginTop: 12 }}>
            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Môn học</div>
              <select
                className={editorStyles.select}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={disabled}
              >
                <option value="" disabled>
                  Chọn môn học...
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Loại câu hỏi</div>
              <select
                className={editorStyles.select}
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                disabled={disabled}
              >
                <option value="mcq_single">Trắc nghiệm 1 đáp án</option>
                <option value="mcq_multi">Trắc nghiệm nhiều đáp án</option>
                <option value="short_answer">Tự luận ngắn</option>
              </select>
            </div>

            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Độ khó mặc định</div>
              <select
                className={editorStyles.select}
                value={defaultDifficulty}
                onChange={(e) =>
                  setDefaultDifficulty(
                    Number(e.target.value) as DifficultyLevel,
                  )
                }
                disabled={disabled}
              >
                <option value={1}>1 ★</option>
                <option value={2}>2 ★</option>
                <option value={3}>3 ★</option>
                <option value={4}>4 ★</option>
                <option value={5}>5 ★</option>
              </select>
            </div>

            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Điểm mặc định</div>
              <input
                className={editorStyles.input}
                type="number"
                min={0.25}
                step={0.25}
                value={defaultScore}
                onChange={(e) => setDefaultScore(Number(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Vị trí trong passage</div>
              <input
                className={editorStyles.input}
                type="number"
                min={1}
                value={passagePosition}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setPassagePosition(Number.isFinite(next) ? next : 1);
                }}
                disabled={disabled}
              />
            </div>

            <div className={editorStyles.metaField}>
              <div className={editorStyles.label}>Môn đã chọn</div>
              <div className={editorStyles.muted}>{subjectName}</div>
            </div>

            <div
              className={editorStyles.metaField}
              style={{ gridColumn: "1 / -1" }}
            >
              <div className={editorStyles.label}>Topic</div>
              <TopicPicker
                subjectId={subjectId}
                selectedIds={topicIds}
                onChange={setTopicIds}
                disabled={disabled}
              />
            </div>
          </div>

          <div className={editorStyles.stack} style={{ marginTop: 14 }}>
            <div className={editorStyles.row}>
              <div className={editorStyles.label}>Câu hỏi</div>
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
              placeholder="Nội dung câu hỏi..."
              disabled={disabled}
            />
          </div>

          <div className={editorStyles.stack} style={{ marginTop: 14 }}>
            <div className={editorStyles.row}>
              <div className={editorStyles.label}>Giải thích (tuỳ chọn)</div>
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
                  altPrefix: "explain",
                })
              }
              placeholder="Giải thích/đáp án..."
              disabled={disabled}
            />
          </div>

          <div className={editorStyles.stack} style={{ marginTop: 14 }}>
            <div className={editorStyles.row}>
              <div className={editorStyles.label}>Đáp án</div>
            </div>

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
                      onClick={() => pickCorrect(idx)}
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
                            (max, option) => Math.max(max, option.position),
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
              <div>
                {shortAnswers.map((ans, idx) => (
                  <div key={ans.clientId} className={editorStyles.optionRow}>
                    <input
                      className={editorStyles.input}
                      value={ans.acceptableAnswer}
                      onChange={(e) =>
                        setShortAnswers((prev) =>
                          prev.map((a, ai) =>
                            ai === idx
                              ? { ...a, acceptableAnswer: e.target.value }
                              : a,
                          ),
                        )
                      }
                      placeholder={`Đáp án ${idx + 1}`}
                      disabled={disabled}
                    />
                    <label className={editorStyles.optionCorrect}>
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
              </div>
            )}
          </div>
        </>
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
    </div>
  );
}
