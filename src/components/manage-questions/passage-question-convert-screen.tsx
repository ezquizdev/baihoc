"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { QuestionDetail } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import {
  deletePassageConversionDraft,
  type PassageConversionDraftV1,
  readPassageConversionDraft,
} from "@/components/manage-questions/passage-conversion-draft";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
import { RichText } from "@/components/ui/rich-text";
import styles from "./passage-editor-screen.module.css";
import editorStyles from "./question-editor-screen.module.css";
import { QuestionInlineConvertToPassage } from "./question-inline-convert";

type ViewMode = "edit" | "split" | "preview";

export function PassageQuestionConvertScreen({
  session,
  subjects,
  questionId,
  initialDetail,
  draftId,
}: {
  session: SessionPayload;
  subjects: Subject[];
  questionId: string;
  initialDetail: QuestionDetail;
  draftId?: string;
}) {
  const router = useRouter();
  const displayName = session.fullName ?? session.email.split("@")[0];

  const [passageContent, setPassageContent] = useState<string>("");
  const [passageViewMode, setPassageViewMode] = useState<ViewMode>("edit");
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PassageConversionDraftV1 | null>(null);

  useEffect(() => {
    if (!draftId) return;
    try {
      const next = readPassageConversionDraft(draftId);
      if (!next) return;
      if (next.sourceQuestionId !== questionId) {
        deletePassageConversionDraft(draftId);
        return;
      }
      setDraft(next);
    } catch {
      // ignore (draft is optional)
    }
  }, [draftId, questionId]);

  const handleConverted = (detail: QuestionDetail) => {
    const nextPassageId = detail.question.passageId;
    if (!nextPassageId) {
      router.push(`/staff/questions/${detail.question.id}`);
      router.refresh();
      return;
    }
    router.push(
      `/staff/questions/passages/${nextPassageId}?questionId=${detail.question.id}`,
    );
    router.refresh();
  };

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
            <h1 className={styles.heroTitle}>
              Chuyển sang câu hỏi có ngữ liệu
            </h1>
            <p className={styles.heroText}>
              Tạo đoạn ngữ liệu mới và đưa câu hỏi hiện tại vào nhóm này. Cho
              tới khi bấm “Chuyển & lưu”, hệ thống chưa lưu gì.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href={`/staff/questions/${questionId}`}
            >
              Quay lại câu hỏi
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href="/staff/questions"
            >
              Về danh sách
            </Link>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Passage">
          <h2 className={styles.sectionTitle}>Đoạn ngữ liệu</h2>
          <p className={styles.sectionSub}>
            Đoạn ngữ liệu này sẽ được dùng chung cho các câu hỏi trong passage.
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
                      onChange={(e) => {
                        setPassageContent(e.target.value);
                        setMediaUploadError(null);
                      }}
                      onPaste={(e) =>
                        handleMarkdownImagePaste(e, {
                          setValue: setPassageContent,
                          setUploadingCount: setMediaUploadingCount,
                          setUploadError: setMediaUploadError,
                          altPrefix: "passage",
                        })
                      }
                      placeholder="Nội dung đoạn ngữ liệu..."
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
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Question">
          <div className={styles.tableTitleRow}>
            <div>
              <h2 className={styles.sectionTitle}>Câu hỏi</h2>
              <div className={styles.subtle}>
                Sau khi chuyển, bạn có thể thêm câu hỏi khác trong passage.
              </div>
            </div>
          </div>

          <div className={styles.expandedCard}>
            <QuestionInlineConvertToPassage
              subjects={subjects}
              questionId={questionId}
              initialDetail={initialDetail}
              passageContent={passageContent}
              draft={draft}
              draftId={draftId}
              onCancel={() => {
                if (draftId) {
                  try {
                    deletePassageConversionDraft(draftId);
                  } catch {
                    // ignore
                  }
                }
                router.back();
              }}
              onConverted={handleConverted}
            />
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
