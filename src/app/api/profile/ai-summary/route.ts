import { type NextRequest, NextResponse } from "next/server";
import {
  controllerGetSelfAiProfileSummaryState,
  controllerRequestSelfAiProfileSummary,
} from "@/application/controllers/aiProfileSummaryController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await controllerGetSelfAiProfileSummaryState({
      userId: auth.sub,
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

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await controllerRequestSelfAiProfileSummary({
      userId: auth.sub,
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
      error instanceof Error ? error.message : "Không thể yêu cầu tạo gợi ý AI";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
