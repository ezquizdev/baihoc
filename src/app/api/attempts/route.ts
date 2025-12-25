import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerStartAttempt } from "@/application/controllers/attemptController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const createSchema = z.object({
  quizId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const result = await controllerStartAttempt(auth.sub, parsed.quizId);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể bắt đầu quiz";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
