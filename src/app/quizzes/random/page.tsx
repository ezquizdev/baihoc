import { redirect } from "next/navigation";
import { controllerGetRandomUnattemptedCatalogQuizId } from "@/application/controllers/quizController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function RandomQuizPage() {
  const session = await requireAuthenticatedPage({ next: "/quizzes/random" });
  const quizId = await controllerGetRandomUnattemptedCatalogQuizId(session.sub);

  if (!quizId) {
    redirect("/quizzes?status=all");
  }

  redirect(`/quizzes/${quizId}/attempt`);
}
