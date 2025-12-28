import { controllerGetLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerListCatalogPage } from "@/application/controllers/quizController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { QuizCatalogScreen } from "@/components/quiz-catalog/quiz-catalog-screen";

const PAGE_SIZE = 12;
const LEADERBOARD_ROWS = 5;

export default async function QuizCatalogPage() {
  const session = await requireAuthenticatedPage({ next: "/quizzes" });
  const [catalog, subjects, leaderboard] = await Promise.all([
    controllerListCatalogPage(session.sub, {
      status: "all",
      sort: "newest",
      limit: PAGE_SIZE,
      offset: 0,
    }),
    controllerListSubjects(),
    controllerGetLeaderboard({
      viewerUserId: session.sub,
      limit: LEADERBOARD_ROWS,
      includeSelf: true,
      subjectId: null,
    }),
  ]);

  return (
    <QuizCatalogScreen
      session={session}
      initialCatalog={catalog}
      subjects={subjects}
      leaderboard={leaderboard}
      leaderboardMaxRows={LEADERBOARD_ROWS}
      leaderboardIncludeSelf={true}
    />
  );
}
