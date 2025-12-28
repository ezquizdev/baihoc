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
  searchParams: Promise<{ questionId?: string; draftId?: string }>;
}) {
  const { passageId } = await params;
  const { questionId, draftId } = await searchParams;

  const next = (() => {
    if (passageId !== "new") return `/staff/questions/passages/${passageId}`;
    const qs = new URLSearchParams();
    if (questionId) qs.set("questionId", questionId);
    if (draftId) qs.set("draftId", draftId);
    const suffix = qs.toString();
    return suffix
      ? `/staff/questions/passages/new?${suffix}`
      : "/staff/questions/passages/new";
  })();

  const session = await requireAuthenticatedPage({
    role: "staff",
    next,
  });

  const subjects = await controllerListSubjects();

  if (passageId === "new") {
    if (!questionId) {
      redirect("/staff/questions/new?type=passage");
    }
    const initialQuestionDetail = await controllerGetQuestionDetail(questionId);
    if (initialQuestionDetail.question.passageId) {
      redirect(
        `/staff/questions/passages/${initialQuestionDetail.question.passageId}?questionId=${questionId}`,
      );
    }
    return (
      <PassageEditorScreen
        mode="convert"
        session={session}
        subjects={subjects}
        questionId={questionId}
        initialQuestionDetail={initialQuestionDetail}
        draftId={draftId}
      />
    );
  }

  const initialDetail = await controllerGetPassageDetail(passageId);

  return (
    <PassageEditorScreen
      mode="edit"
      session={session}
      subjects={subjects}
      passageId={passageId}
      initialDetail={initialDetail}
    />
  );
}
