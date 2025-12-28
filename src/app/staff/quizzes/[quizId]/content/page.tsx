import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { ManageQuizContentScreen } from "@/components/manage-quiz/manage-quiz-content-screen";

type Params = { quizId: string };

export default async function StaffQuizContentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { quizId } = await params;

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: `/staff/quizzes/${quizId}/content`,
  });

  const subjects = await controllerListSubjects();

  return (
    <ManageQuizContentScreen
      session={session}
      quizId={quizId}
      subjects={subjects}
    />
  );
}
