import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerDeletePassage,
  controllerGetPassageDetail,
  controllerUpdatePassage,
} from "@/application/controllers/passageController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const updateSchema = z.object({
  content: z.string().min(1),
});

type Params = { passageId: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const { passageId } = await context.params;
    const detail = await controllerGetPassageDetail(passageId);
    return NextResponse.json(detail);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không tìm thấy đoạn văn";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const { passageId } = await context.params;
    const result = await controllerUpdatePassage(passageId, parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật đoạn văn";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const { passageId } = await context.params;
    const result = await controllerDeletePassage(passageId);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể xóa đoạn văn";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
