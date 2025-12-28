import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerCreateAiChatSession,
  controllerListAiChatSessions,
} from "@/application/controllers/aiChatController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
});

const createBodySchema = z.object({
  entryPoint: z.enum(["home", "result", "question"]).default("home"),
  attemptId: z.string().uuid().nullable().optional(),
  questionId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = listQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await controllerListAiChatSessions({
      userId: auth.sub,
      limit: parsed.limit,
      offset: parsed.offset,
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
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách hội thoại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = createBodySchema.parse(
      await request.json().catch(() => ({})),
    );
    const result = await controllerCreateAiChatSession({
      userId: auth.sub,
      entryPoint: parsed.entryPoint,
      attemptId: parsed.attemptId ?? null,
      questionId: parsed.questionId ?? null,
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
      error instanceof Error ? error.message : "Không thể tạo hội thoại";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
