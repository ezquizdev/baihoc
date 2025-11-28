import { controllerListQuestions } from "@/application/controllers/questionController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { ManageQuestionsScreen } from "@/components/manage-questions/manage-questions-screen";

const INITIAL_LIMIT = 20;

export default async function StaffQuestionsPage() {
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/questions",
  });

  const [subjects, initial] = await Promise.all([
    controllerListSubjects(),
    controllerListQuestions({
      status: "active",
      limit: INITIAL_LIMIT,
      offset: 0,
    }),
  ]);

  return (
    <ManageQuestionsScreen
      session={session}
      subjects={subjects}
      initialItems={initial.items}
      initialTotal={initial.total}
      initialLimit={INITIAL_LIMIT}
    />
  );
}
