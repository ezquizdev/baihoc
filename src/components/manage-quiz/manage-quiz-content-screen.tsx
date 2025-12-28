"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { Subject } from "@/application/models/subject";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { QuestionEditModal } from "./modals/question-edit-modal";
import { QuizBuilderModal } from "./modals/quiz-builder-modal";

type QuestionEditTarget = {
  quizId: string;
  questionId: string;
  position: number;
};

type ManageQuizContentScreenProps = {
  session: SessionPayload;
  quizId: string;
  subjects: Subject[];
};

export function ManageQuizContentScreen({
  session,
  quizId,
  subjects,
}: ManageQuizContentScreenProps) {
  const router = useRouter();
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [builderRefreshKey, setBuilderRefreshKey] = useState(0);
  const [questionTarget, setQuestionTarget] =
    useState<QuestionEditTarget | null>(null);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  return (
    <StaffShell
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      hideSearch
    >
      <div />

      <QuizBuilderModal
        quizId={quizId}
        refreshKey={builderRefreshKey}
        subjects={subjects}
        onClose={() => {
          router.push("/staff/quizzes");
        }}
        onEditQuestion={(questionId, position) =>
          setQuestionTarget({ quizId, questionId, position })
        }
        onMutated={() => {}}
      />

      <QuestionEditModal
        target={questionTarget}
        onClose={() => setQuestionTarget(null)}
        onSaved={() => setBuilderRefreshKey((prev) => prev + 1)}
      />
    </StaffShell>
  );
}
