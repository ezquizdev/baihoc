import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { controllerCreatePassage } from "@/application/controllers/passageController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

const createSchema = z.object({
  content: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.parse(body);
    const result = await controllerCreatePassage(parsed);
    return NextResponse.json(result);
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tạo đoạn ngữ liệu";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
