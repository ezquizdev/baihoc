"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { QuestionDetail } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { handleMarkdownImagePaste } from "@/components/ui/markdown-image-paste";
import { RichText } from "@/components/ui/rich-text";
import styles from "./passage-editor-screen.module.css";
import editorStyles from "./question-editor-screen.module.css";
import { QuestionInlineCreate } from "./question-inline-create";

type ViewMode = "edit" | "split" | "preview";

export function PassageQuestionCreateScreen({
  session,
  subjects,
}: {
  session: SessionPayload;
  subjects: Subject[];
}) {
  const router = useRouter();
  const displayName = session.fullName ?? session.email.split("@")[0];

  const [passageContent, setPassageContent] = useState<string>("");
  const [passageViewMode, setPassageViewMode] = useState<ViewMode>("edit");
  const [mediaUploadingCount, setMediaUploadingCount] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const handleCreated = (detail: QuestionDetail) => {
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
            <h1 className={styles.heroTitle}>Tạo câu hỏi với ngữ liệu</h1>
            <p className={styles.heroText}>
              Tạo đoạn ngữ liệu và câu hỏi đầu tiên. Sau khi tạo xong, bạn sẽ được
              chuyển tới màn hình quản lý để thêm/xóa các câu hỏi khác.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href="/staff/questions/new"
            >
              Chọn loại khác
            </Link>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href="/staff/questions"
            >
              Quay lại
            </Link>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Passage">
          <h2 className={styles.sectionTitle}>Đoạn ngữ liệu</h2>
          <p className={styles.sectionSub}>
            Đoạn ngữ liệu này sẽ được dùng chung cho các câu hỏi trong đoạn ngữ liệu.
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

        <section
          className={`cardBase ${styles.card}`}
          aria-label="First question"
        >
          <div className={styles.tableTitleRow}>
            <div>
              <h2 className={styles.sectionTitle}>Câu hỏi đầu tiên</h2>
              <div className={styles.subtle}>
                Tip: sau khi tạo xong, dùng “+ Thêm câu hỏi” để bổ sung câu hỏi
                khác trong đoạn ngữ liệu.
              </div>
            </div>
          </div>

          <div className={styles.expandedCard}>
            <QuestionInlineCreate
              subjects={subjects}
              passageContent={passageContent}
              initialPassagePosition={1}
              initialSubjectId={subjects[0]?.id}
              onCancel={() => router.push("/staff/questions/new")}
              onCreated={handleCreated}
            />
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
