import { redirect } from "next/navigation";
import { controllerGetPassageDetail } from "@/application/controllers/passageController";
import { controllerGetQuestionDetail } from "@/application/controllers/questionController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { PassageEditorScreen } from "@/components/manage-questions/passage-editor-screen";

type Params = { passageId: string };

export default async function StaffPassageEditorPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{
    questionId?: string;
    convertQuestionId?: string;
    draftId?: string;
  }>;
}) {
  const { passageId } = await params;
  const { convertQuestionId, draftId } = await searchParams;

  if (passageId === "new") {
    redirect("/staff/questions/new?type=passage");
  }

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: `/staff/questions/passages/${passageId}`,
  });

  const [subjects, initialDetail, convertQuestionDetail] = await Promise.all([
    controllerListSubjects(),
    controllerGetPassageDetail(passageId),
    convertQuestionId ? controllerGetQuestionDetail(convertQuestionId) : null,
  ]);

  return (
    <PassageEditorScreen
      session={session}
      subjects={subjects}
      passageId={passageId}
      initialDetail={initialDetail}
      convert={
        convertQuestionId && convertQuestionDetail
          ? {
              questionId: convertQuestionId,
              initialQuestionDetail: convertQuestionDetail,
              draftId,
            }
          : null
      }
    />
  );
}
