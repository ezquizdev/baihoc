import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerSendAiChatMessage } from "@/application/controllers/aiChatController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const bodySchema = z.object({
  entryPoint: z.enum(["home", "result", "question"]),
  attemptId: z.string().uuid().nullable().optional(),
  questionId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
  message: z.string().max(6000),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = bodySchema.parse(await request.json());

    const result = await controllerSendAiChatMessage({
      userId: auth.sub,
      entryPoint: parsed.entryPoint,
      attemptId: parsed.attemptId ?? null,
      questionId: parsed.questionId ?? null,
      sessionId: parsed.sessionId ?? null,
      message: parsed.message,
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
      error instanceof Error ? error.message : "Không thể gửi câu hỏi tới AI";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
