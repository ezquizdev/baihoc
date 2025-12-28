import { redirect } from "next/navigation";
import { controllerGetQuestionDetail } from "@/application/controllers/questionController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { PassageQuestionConvertScreen } from "@/components/manage-questions/passage-question-convert-screen";

type Props = {
  searchParams: Promise<{ questionId?: string; draftId?: string }>;
};

export default async function StaffPassageConvertPage({ searchParams }: Props) {
  const params = await searchParams;
  const questionId = params.questionId;
  const draftId = params.draftId;

  if (!questionId) {
    redirect("/staff/questions/new?type=passage");
  }

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: `/staff/questions/passages/new?questionId=${questionId}`,
  });

  const [subjects, initialDetail] = await Promise.all([
    controllerListSubjects(),
    controllerGetQuestionDetail(questionId),
  ]);

  if (initialDetail.question.passageId) {
    redirect(
      `/staff/questions/passages/${initialDetail.question.passageId}?questionId=${questionId}`,
    );
  }

  return (
    <PassageQuestionConvertScreen
      session={session}
      subjects={subjects}
      questionId={questionId}
      initialDetail={initialDetail}
      draftId={draftId}
    />
  );
}
