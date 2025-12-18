import { type NextRequest, NextResponse } from "next/server";
import { controllerGetPublishedQuiz } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

type Params = {
  quizId: string;
};

export async function GET(request: NextRequest, context: { params: Params }) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const quiz = await controllerGetPublishedQuiz(context.params.quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải quiz";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
