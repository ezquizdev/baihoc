import { redirect } from "next/navigation";
import { controllerGetRandomUnattemptedCatalogQuizId } from "@/application/controllers/quizController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function RandomQuizPage() {
  const session = await requireAuthenticatedPage({ next: "/quizzes/random" });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const quizId = await controllerGetRandomUnattemptedCatalogQuizId(
    session.sub,
    { includePremium: session.tier === "paid" },
  );

  if (!quizId) {
    redirect("/quizzes?status=all");
  }

  redirect(`/quizzes/${quizId}/attempt`);
}
