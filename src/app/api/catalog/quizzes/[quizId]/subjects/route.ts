import { type NextRequest, NextResponse } from "next/server";
import { controllerGetQuizSubjectBreakdown } from "@/application/controllers/quizController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(
  request: NextRequest,
  context: { params: { quizId: string } },
) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const items = await controllerGetQuizSubjectBreakdown(
      context.params.quizId,
    );
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải thông tin môn học";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
