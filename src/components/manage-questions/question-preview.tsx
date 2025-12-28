"use client";

import type { QuestionType } from "@/application/models/enums";
import { RichText } from "@/components/ui/rich-text";
import styles from "./question-editor-screen.module.css";

type PreviewOption = {
  label: string | null;
  text: string;
  isCorrect?: boolean;
};

type PreviewShortAnswer = {
  acceptableAnswer: string;
  caseSensitive?: boolean;
};

export function QuestionPreview({
  passageContent,
  stem,
  explanation,
  type,
  options,
  shortAnswers,
  showCorrect = true,
  title = "Xem trước",
}: {
  passageContent?: string | null;
  stem: string;
  explanation: string;
  type: QuestionType;
  options: PreviewOption[];
  shortAnswers: PreviewShortAnswer[];
  showCorrect?: boolean;
  title?: string;
}) {
  const safeStem = stem.trim();
  const safeExplanation = explanation.trim();
  const safePassage = (passageContent ?? "").trim();

  const isMcq = type === "mcq_single" || type === "mcq_multi";
  const isMultiCorrect = type === "mcq_multi";

  const normalizedOptions = options
    .slice()
    .map((opt, index) => ({
      index,
      label: opt.label?.trim() || null,
      text: opt.text ?? "",
      isCorrect: Boolean(opt.isCorrect),
    }))
    .filter((opt) => opt.label || opt.text.trim());

  const normalizedShortAnswers = shortAnswers
    .map((ans) => ({
      acceptableAnswer: ans.acceptableAnswer?.trim() ?? "",
      caseSensitive: Boolean(ans.caseSensitive),
    }))
    .filter((ans) => ans.acceptableAnswer);

  return (
    <aside className={styles.previewPanel} aria-label="Preview">
      <h3 className={styles.previewTitle}>{title}</h3>

      {safePassage ? (
        <div className={styles.previewSection}>
          <h4 className={styles.previewLabel}>Đoạn ngữ liệu</h4>
          <RichText content={safePassage} allowLinks />
        </div>
      ) : null}

      <div className={styles.previewSection}>
        <h4 className={styles.previewLabel}>Nội dung câu hỏi</h4>
        {safeStem ? (
          <RichText content={safeStem} allowLinks />
        ) : (
          <div className={styles.previewEmpty}>
            Chưa có nội dung câu hỏi để xem trước.
          </div>
        )}
      </div>

      <div className={styles.previewSection}>
        <h4 className={styles.previewLabel}>
          {isMcq ? "Đáp án" : "Đáp án (tự luận)"}
        </h4>

        {isMcq ? (
          normalizedOptions.length ? (
            <>
              <div className={styles.muted}>
                {isMultiCorrect
                  ? "Chọn một hoặc nhiều đáp án đúng."
                  : "Chọn đúng 1 đáp án."}
              </div>
              <div className={styles.previewOptions}>
                {normalizedOptions.map((opt) => (
                  <div
                    key={`${opt.index}-${opt.label ?? ""}`}
                    className={styles.previewOption}
                  >
                    <div className={styles.previewOptionMeta}>
                      {opt.label ? `${opt.label}.` : `${opt.index + 1}.`}
                    </div>
                    <div>
                      <RichText
                        content={opt.text}
                        variant="inline"
                        allowLinks={false}
                      />
                    </div>
                    {showCorrect && opt.isCorrect ? (
                      <div className={styles.previewOptionCorrect}>Đúng ✓</div>
                    ) : (
                      <div className={styles.previewOptionSpacer} />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.previewEmpty}>
              Chưa có đáp án để xem trước.
            </div>
          )
        ) : normalizedShortAnswers.length ? (
          <div className={styles.previewOptions}>
            {normalizedShortAnswers.map((ans) => (
              <div
                key={`${ans.acceptableAnswer}-${ans.caseSensitive}`}
                className={styles.previewOption}
                style={{ gridTemplateColumns: "1fr auto" }}
              >
                <div className={styles.previewOptionMeta}>
                  {ans.acceptableAnswer}
                </div>
                {ans.caseSensitive ? (
                  <div className={styles.previewOptionCorrect}>
                    Phân biệt hoa/thường
                  </div>
                ) : (
                  <div className={styles.previewOptionSpacer} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.previewEmpty}>
            Chưa có đáp án để xem trước.
          </div>
        )}
      </div>

      <div className={styles.previewSection}>
        <h4 className={styles.previewLabel}>Giải thích</h4>
        {safeExplanation ? (
          <RichText content={safeExplanation} allowLinks />
        ) : (
          <div className={styles.previewEmpty}>Chưa có giải thích.</div>
        )}
      </div>
    </aside>
  );
}
