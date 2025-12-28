"use client";

import { useMemo, useState } from "react";
import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type { QuestionDetail } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
import {
  type AnswerDraft,
  buildDefaultMcqOptions,
  buildEmptyShortAnswer,
  normalizeOptionsForPayload,
  type OptionDraft,
} from "./question-draft";
import editorStyles from "./question-editor-screen.module.css";
import { QuestionPreview } from "./question-preview";
import { TopicPicker } from "./topic-picker";

type ViewMode = "edit" | "split" | "preview";

export function QuestionInlineCreate({
  subjects,
  passageId,
  passageContent,
  initialPassagePosition,
  initialSubjectId,
  initialType = "mcq_single",
  onCancel,
  onCreated,
}: {
  subjects: Subject[];
  passageId?: string;
  passageContent?: string;
  initialPassagePosition: number;
  initialSubjectId?: string;
  initialType?: QuestionType;
  onCancel: () => void;
  onCreated: (detail: QuestionDetail) => void;
}) {
  const [subjectId, setSubjectId] = useState<string>(
    initialSubjectId ?? subjects[0]?.id ?? "",
  );
  const [type, setType] = useState<QuestionType>(initialType);
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>(
    3 as DifficultyLevel,
  );
  const [defaultScore, setDefaultScore] = useState<number>(1);
  const [stem, setStem] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [passagePosition, setPassagePosition] = useState<number>(
    Math.max(1, initialPassagePosition),
  );

  const [options, setOptions] = useState<OptionDraft[]>(() =>
    buildDefaultMcqOptions(),
  );
  const [shortAnswers, setShortAnswers] = useState<AnswerDraft[]>(() => [
    buildEmptyShortAnswer(),
  ]);

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

    if (!passageId) {
      if (!(passageContent ?? "").trim()) return false;
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
    passageContent,
    passageId,
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
      };

      if (passageId) {
        payload.passageId = passageId;
      } else {
        const content = (passageContent ?? "").trim();
        if (!content) {
          throw new Error("Đoạn ngữ liệu không được để trống.");
        }
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

      const response = await fetch("/api/staff/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không thể tạo câu hỏi");
      }
      const data = (await response.json()) as { question?: QuestionDetail };
      if (!data.question) throw new Error("Không thể tạo câu hỏi");
      onCreated(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving;
  const titleLabel = passageId
    ? `Câu hỏi #${passagePosition}`
    : "Câu hỏi đầu tiên";
  const subjectName =
    subjects.find((subject) => subject.id === subjectId)?.name ?? "";

  return (
    <div>
      <div
        className={editorStyles.row}
        style={{ justifyContent: "space-between" }}
      >
        <div className={editorStyles.label}>{titleLabel}</div>
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
            {saving ? "Đang tạo..." : "Tạo câu hỏi"}
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
        <div
          className={
            viewMode === "split" ? editorStyles.splitLayout : undefined
          }
        >
          <div>
            <div className={editorStyles.grid}>
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
                  <option value="" disabled>
                    Chọn môn học...
                  </option>
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
                  <div className={editorStyles.label}>
                    Vị trí trong cụm câu hỏi
                  </div>
                </div>
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
                      altPrefix: "explain",
                    })
                  }
                  placeholder="Giải thích..."
                  disabled={disabled}
                />

                {isMcq ? (
                  <div className={editorStyles.stack} style={{ marginTop: 16 }}>
                    <h3 className={editorStyles.sectionTitle}>Đáp án</h3>
                    <div className={editorStyles.muted}>
                      {isMultiCorrect
                        ? "Chọn một hoặc nhiều đáp án đúng."
                        : "Chọn đúng 1 đáp án."}
                    </div>
                    {options.map((opt, idx) => (
                      <div
                        key={`${opt.position}-${idx}`}
                        className={editorStyles.optionRow}
                      >
                        <label className={editorStyles.smallBtn}>
                          <input
                            type={isMultiCorrect ? "checkbox" : "radio"}
                            name="correct"
                            checked={opt.isCorrect}
                            onChange={() => pickCorrect(idx)}
                            disabled={disabled}
                          />{" "}
                          Đúng
                        </label>
                        <input
                          className={editorStyles.input}
                          value={opt.text}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((o, oi) =>
                                oi === idx ? { ...o, text: e.target.value } : o,
                              ),
                            )
                          }
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
                          placeholder={`Đáp án ${idx + 1}...`}
                          disabled={disabled}
                        />
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
                          setOptions((prev) => [
                            ...prev,
                            {
                              label: null,
                              text: "",
                              isCorrect: false,
                              position:
                                prev.reduce(
                                  (max, opt) => Math.max(max, opt.position),
                                  0,
                                ) + 1,
                            },
                          ])
                        }
                        disabled={disabled}
                      >
                        + Thêm đáp án
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={editorStyles.stack} style={{ marginTop: 16 }}>
                    <h3 className={editorStyles.sectionTitle}>
                      Đáp án (tự luận)
                    </h3>
                    {shortAnswers.map((ans, idx) => (
                      <div
                        key={ans.clientId}
                        className={editorStyles.optionRow}
                      >
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
                          placeholder="Đáp án chấp nhận..."
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewMode === "split" ? (
            <QuestionPreview
              passageContent={passageContent}
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
    </div>
  );
}
