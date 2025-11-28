import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { QuestionEditorScreen } from "@/components/manage-questions/question-editor-screen";

export default async function StaffQuestionCreatePage() {
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/questions/new",
  });

  const subjects = await controllerListSubjects();

  return (
    <QuestionEditorScreen session={session} subjects={subjects} mode="create" />
  );
}
