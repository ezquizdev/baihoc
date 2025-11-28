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
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/questions",
  });

  const { questionId } = await params;

  const [subjects, initialDetail] = await Promise.all([
    controllerListSubjects(),
    controllerGetQuestionDetail(questionId),
  ]);

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
