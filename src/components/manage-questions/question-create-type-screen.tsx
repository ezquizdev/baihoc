"use client";

import Link from "next/link";
import type { SessionPayload } from "@/application/infra/auth/session";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "./question-create-type-screen.module.css";
import editorStyles from "./question-editor-screen.module.css";

export function QuestionCreateTypeScreen({
  session,
}: {
  session: SessionPayload;
}) {
  const displayName = session.fullName ?? session.email.split("@")[0];

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
        <section className={`cardBase ${editorStyles.hero}`} aria-label="Hero">
          <div>
            <h1 className={editorStyles.heroTitle}>Tạo câu hỏi</h1>
            <p className={editorStyles.heroText}>
              Chọn loại câu hỏi để bắt đầu. Bạn có thể tạo câu hỏi đơn lẻ hoặc
              một nhóm passage (đoạn văn + nhiều câu hỏi).
            </p>
          </div>
          <div className={editorStyles.heroActions}>
            <Link
              className={`${editorStyles.btn} ${editorStyles.btnGray}`}
              href="/staff/questions"
            >
              Quay lại
            </Link>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Types">
          <h2 className={editorStyles.sectionTitle}>Chọn loại</h2>
          <div className={styles.grid}>
            <Link
              className={styles.typeCard}
              href="/staff/questions/new?type=mcq_single"
            >
              <h3 className={styles.typeTitle}>MCQ (1 đáp án)</h3>
              <p className={styles.typeDesc}>
                Trắc nghiệm một đáp án đúng. Phù hợp cho đa số câu hỏi lựa chọn.
              </p>
              <div className={styles.typeMeta}>
                <span className={styles.pill}>mcq_single</span>
              </div>
            </Link>

            <Link
              className={styles.typeCard}
              href="/staff/questions/new?type=mcq_multi"
            >
              <h3 className={styles.typeTitle}>MCQ (nhiều đáp án)</h3>
              <p className={styles.typeDesc}>
                Trắc nghiệm nhiều đáp án đúng. Cho phép chọn nhiều lựa chọn.
              </p>
              <div className={styles.typeMeta}>
                <span className={styles.pill}>mcq_multi</span>
              </div>
            </Link>

            <Link
              className={styles.typeCard}
              href="/staff/questions/new?type=short_answer"
            >
              <h3 className={styles.typeTitle}>Tự luận ngắn</h3>
              <p className={styles.typeDesc}>
                Trả lời ngắn. Hệ thống chấm theo danh sách đáp án chấp nhận.
              </p>
              <div className={styles.typeMeta}>
                <span className={styles.pill}>short_answer</span>
              </div>
            </Link>

            <Link
              className={styles.typeCard}
              href="/staff/questions/new?type=passage"
            >
              <h3 className={styles.typeTitle}>
                Passage (đoạn văn + nhiều câu hỏi)
              </h3>
              <p className={styles.typeDesc}>
                Tạo một đoạn văn dùng chung cho nhiều câu hỏi và quản lý tất cả
                trên cùng một màn hình.
              </p>
              <div className={styles.typeMeta}>
                <span className={styles.pill}>passage</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
