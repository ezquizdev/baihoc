import { type NextRequest, NextResponse } from "next/server";
import { controllerArchiveQuiz } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

type Params = { quizId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const { quizId } = await context.params;
    const quiz = await controllerArchiveQuiz(quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể lưu trữ quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
