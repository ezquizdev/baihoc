import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import {
  type QuestionType,
  QuestionTypeValues,
} from "@/application/models/enums";
import { PassageQuestionCreateScreen } from "@/components/manage-questions/passage-question-create-screen";
import { QuestionCreateTypeScreen } from "@/components/manage-questions/question-create-type-screen";
import { QuestionEditorScreen } from "@/components/manage-questions/question-editor-screen";

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export default async function StaffQuestionCreatePage({ searchParams }: Props) {
  const params = await searchParams;
  const type = params.type;

  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/questions/new",
  });

  const subjects = await controllerListSubjects();

  if (!type) {
    return <QuestionCreateTypeScreen session={session} />;
  }

  if (type === "passage") {
    return (
      <PassageQuestionCreateScreen session={session} subjects={subjects} />
    );
  }

  const resolvedType = QuestionTypeValues.find((value) => value === type) as
    | QuestionType
    | undefined;

  if (!resolvedType) {
    return <QuestionCreateTypeScreen session={session} />;
  }

  return (
    <QuestionEditorScreen
      session={session}
      subjects={subjects}
      mode="create"
      initialType={resolvedType}
    />
  );
}
