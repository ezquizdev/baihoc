import { controllerListTopLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerListStaffQuizzes } from "@/application/controllers/quizController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { ManageQuizScreen } from "@/components/manage-quiz/manage-quiz-screen";

const INITIAL_LIMIT = 100;

export default async function StaffQuizzesPage() {
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/quizzes",
  });
  const [initialQuizzes, subjects, leaderboard] = await Promise.all([
    controllerListStaffQuizzes({ limit: INITIAL_LIMIT, offset: 0 }),
    controllerListSubjects(),
    controllerListTopLeaderboard(7),
  ]);

  return (
    <ManageQuizScreen
      session={session}
      initialQuizzes={initialQuizzes}
      initialLimit={INITIAL_LIMIT}
      subjects={subjects}
      leaderboard={leaderboard}
    />
  );
}
