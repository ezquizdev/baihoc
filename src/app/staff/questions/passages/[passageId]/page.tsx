import { controllerGetPassageDetail } from "@/application/controllers/passageController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { PassageEditorScreen } from "@/components/manage-questions/passage-editor-screen";

type Params = { passageId: string };

export default async function StaffPassageEditorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { passageId } = await params;

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: `/staff/questions/passages/${passageId}`,
  });

  const [subjects, initialDetail] = await Promise.all([
    controllerListSubjects(),
    controllerGetPassageDetail(passageId),
  ]);

  return (
    <PassageEditorScreen
      session={session}
      subjects={subjects}
      passageId={passageId}
      initialDetail={initialDetail}
    />
  );
}
