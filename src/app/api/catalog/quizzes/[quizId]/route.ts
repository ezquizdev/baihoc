import { type NextRequest, NextResponse } from "next/server";
import { controllerGetPublishedQuiz } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

type Params = {
  quizId: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const { quizId } = await context.params;
    const quiz = await controllerGetPublishedQuiz(quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tải quiz";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
