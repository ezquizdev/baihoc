import { controllerListTopLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerListCatalogPage } from "@/application/controllers/quizController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { QuizCatalogScreen } from "@/components/quiz-catalog/quiz-catalog-screen";

const PAGE_SIZE = 12;

export default async function QuizCatalogPage() {
  const session = await requireAuthenticatedPage({ next: "/quizzes" });
  const [catalog, subjects, leaderboard] = await Promise.all([
    controllerListCatalogPage(session.sub, {
      status: "todo",
      sort: "newest",
      limit: PAGE_SIZE,
      offset: 0,
    }),
    controllerListSubjects(),
    controllerListTopLeaderboard(7),
  ]);

  return (
    <QuizCatalogScreen
      session={session}
      initialCatalog={catalog}
      subjects={subjects}
      leaderboard={leaderboard}
    />
  );
}
