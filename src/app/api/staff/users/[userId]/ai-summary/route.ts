import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerGetAdminAiProfileSummaryState,
  controllerRequestAdminAiProfileSummaryRegenerate,
} from "@/application/controllers/aiProfileSummaryController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

type Params = { userId: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const { userId } = await context.params;
    const parsed = z.string().uuid().parse(userId);
    const result = await controllerGetAdminAiProfileSummaryState({
      userId: parsed,
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
      error instanceof Error ? error.message : "Không thể tải AI summary";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const { userId } = await context.params;
    const parsed = z.string().uuid().parse(userId);
    const result = await controllerRequestAdminAiProfileSummaryRegenerate({
      actorUserId: session.sub,
      userId: parsed,
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
      error instanceof Error ? error.message : "Không thể tạo lại AI summary";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
