import { type NextRequest, NextResponse } from "next/server";
import { controllerRejudgeAttempt } from "@/application/controllers/attemptController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

type Params = { attemptId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
    role: "student",
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const { attemptId } = await context.params;
    const result = await controllerRejudgeAttempt(auth.sub, attemptId);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể chấm lại bài làm";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
