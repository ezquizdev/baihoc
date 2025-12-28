import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerGetAiChatSessionState } from "@/application/controllers/aiChatController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const querySchema = z.object({
  entryPoint: z.enum(["home", "result", "question"]),
  attemptId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const result = await controllerGetAiChatSessionState({
      userId: auth.sub,
      entryPoint: parsed.entryPoint,
      attemptId: parsed.attemptId ?? null,
      questionId: parsed.questionId ?? null,
      sessionId: parsed.sessionId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tải AI session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
