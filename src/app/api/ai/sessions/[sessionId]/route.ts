import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerGetAiChatConversation } from "@/application/controllers/aiChatController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

type Params = { sessionId: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const { sessionId } = await context.params;
    const parsed = z.string().uuid().parse(sessionId);
    const result = await controllerGetAiChatConversation({
      userId: auth.sub,
      sessionId: parsed,
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
      error instanceof Error ? error.message : "Không thể tải hội thoại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
