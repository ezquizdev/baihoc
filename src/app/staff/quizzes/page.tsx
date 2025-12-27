import { controllerGetLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerListStaffQuizzes } from "@/application/controllers/quizController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { ManageQuizScreen } from "@/components/manage-quiz/manage-quiz-screen";

const INITIAL_LIMIT = 100;
const LEADERBOARD_ROWS = 5;

export default async function StaffQuizzesPage() {
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/quizzes",
  });
  const [initialQuizzes, subjects, leaderboard] = await Promise.all([
    controllerListStaffQuizzes({ limit: INITIAL_LIMIT, offset: 0 }),
    controllerListSubjects(),
    controllerGetLeaderboard({
      viewerUserId: session.sub,
      limit: LEADERBOARD_ROWS,
      includeSelf: false,
      subjectId: null,
    }),
  ]);

  return (
    <ManageQuizScreen
      session={session}
      initialQuizzes={initialQuizzes}
      initialLimit={INITIAL_LIMIT}
      subjects={subjects}
      leaderboard={leaderboard}
      leaderboardMaxRows={LEADERBOARD_ROWS}
      leaderboardIncludeSelf={false}
    />
  );
}
