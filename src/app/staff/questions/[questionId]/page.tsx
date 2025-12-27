import { redirect } from "next/navigation";
import { controllerGetQuestionDetail } from "@/application/controllers/questionController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { QuestionEditorScreen } from "@/components/manage-questions/question-editor-screen";

type Params = { questionId: string };

export default async function StaffQuestionDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { questionId } = await params;

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: `/staff/questions/${questionId}`,
  });

  const initialDetail = await controllerGetQuestionDetail(questionId);
  if (initialDetail.question.passageId) {
    redirect(
      `/staff/questions/passages/${initialDetail.question.passageId}?questionId=${questionId}`,
    );
  }

  const subjects = await controllerListSubjects();

  return (
    <QuestionEditorScreen
      session={session}
      subjects={subjects}
      mode="edit"
      questionId={questionId}
      initialDetail={initialDetail}
    />
  );
}
