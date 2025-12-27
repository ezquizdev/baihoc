import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerAutosaveAttempt,
  controllerGetAttemptState,
} from "@/application/controllers/attemptController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()).nullable().optional(),
  textAnswer: z.string().nullable().optional(),
});

const autosaveSchema = z.object({
  answers: z.array(answerSchema).default([]),
  remainingSeconds: z.number().int().nonnegative().nullable().optional(),
});

type Params = { attemptId: string };

export async function GET(
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
    const result = await controllerGetAttemptState(auth.sub, attemptId);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tải trạng thái";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
    role: "student",
  });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = autosaveSchema.parse(body);
    const { attemptId } = await context.params;
    const result = await controllerAutosaveAttempt(auth.sub, attemptId, parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể lưu câu trả lời";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
