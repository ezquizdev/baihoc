"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { Subject } from "@/application/models/subject";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "./passage-editor-screen.module.css";

export function PassageQuestionCreateScreen({
  session,
  subjects: _subjects,
}: {
  session: SessionPayload;
  subjects: Subject[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = session.fullName ?? session.email.split("@")[0];

  const callbackQuizId =
    searchParams.get("from") === "quiz-builder"
      ? searchParams.get("quizId")
      : null;
  const isQuizCallback = Boolean(callbackQuizId);
  const returnHref = callbackQuizId
    ? `/staff/quizzes/${callbackQuizId}/content`
    : "/staff/quizzes";

  const chooseTypeHref =
    isQuizCallback && callbackQuizId
      ? `/staff/questions/new?${new URLSearchParams({
          from: "quiz-builder",
          quizId: callbackQuizId,
        })}`
      : "/staff/questions/new";

  const closeOrRedirect = () => {
    if (!isQuizCallback || !callbackQuizId) return;
    window.close();
    window.setTimeout(() => {
      window.location.assign(returnHref);
    }, 250);
  };

  const didCreateRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (didCreateRef.current) return;
    didCreateRef.current = true;

    const run = async () => {
      try {
        setError(null);
        const response = await fetch("/api/staff/passages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "" }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error ?? "Không thể tạo đoạn ngữ liệu");
        }
        const data = (await response.json()) as { passage?: { id?: string } };
        const passageId = data.passage?.id;
        if (!passageId) throw new Error("Không thể tạo đoạn ngữ liệu");

        const nextParams = new URLSearchParams({ create: "1" });
        if (isQuizCallback && callbackQuizId) {
          nextParams.set("from", "quiz-builder");
          nextParams.set("quizId", callbackQuizId);
        }

        router.push(`/staff/questions/passages/${passageId}?${nextParams}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không thể tạo đoạn ngữ liệu",
        );
      }
    };

    void run();
  }, [router, isQuizCallback, callbackQuizId]);

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
              {isQuizCallback
                ? "Đang tạo một passage trống để bạn chỉnh sửa và thêm nhiều câu hỏi vào quiz. Mỗi câu hỏi tạo xong sẽ tự được thêm vào quiz."
                : "Đang tạo một passage trống để bạn chỉnh sửa và thêm câu hỏi."}
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.btn} ${styles.btnGray}`}
              href={chooseTypeHref as Parameters<typeof Link>[0]["href"]}
            >
              Chọn loại khác
            </Link>
            {isQuizCallback ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGray}`}
                onClick={closeOrRedirect}
              >
                Quay lại quiz
              </button>
            ) : (
              <Link
                className={`${styles.btn} ${styles.btnGray}`}
                href="/staff/questions"
              >
                Quay lại
              </Link>
            )}
          </div>
        </section>
        {error ? (
          <section className={`cardBase ${styles.card}`} aria-label="Error">
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          </section>
        ) : null}
      </div>
    </StaffShell>
  );
}
