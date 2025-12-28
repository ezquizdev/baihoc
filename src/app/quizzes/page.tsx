import { controllerGetLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerListCatalogPage } from "@/application/controllers/quizController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { QuizCatalogScreen } from "@/components/quiz-catalog/quiz-catalog-screen";

const PAGE_SIZE = 12;
const LEADERBOARD_ROWS = 5;

type QuizCatalogPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function QuizCatalogPage({
  searchParams,
}: QuizCatalogPageProps) {
  const session = await requireAuthenticatedPage({ next: "/quizzes" });
  const status = parseStatus(searchParams?.status);
  const openCustom = parseBoolean(searchParams?.custom);
  const [catalog, subjects, leaderboard] = await Promise.all([
    controllerListCatalogPage(session.sub, {
      status: status ?? "all",
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
      initialStatus={status ?? "all"}
      initialOpenCustomQuiz={openCustom}
    />
  );
}

function parseStatus(value: string | string[] | undefined) {
  if (!value) return undefined;
  const next = Array.isArray(value) ? value[0] : value;
  if (next === "all" || next === "done" || next === "challenge") return next;
  return undefined;
}

function parseBoolean(value: string | string[] | undefined) {
  if (!value) return false;
  const next = Array.isArray(value) ? value[0] : value;
  return next === "1" || next === "true";
}
