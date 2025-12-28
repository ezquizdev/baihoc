import { type NextRequest, NextResponse } from "next/server";
import { controllerUploadStaffQuestionImage } from "@/application/controllers/mediaController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApi(request, { role: "staff" });
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Thiếu file ảnh (file)." },
        { status: 400 },
      );
    }

    const contentType = file.type?.split(";")[0] ?? "";
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await controllerUploadStaffQuestionImage({
      userId: auth.sub,
      fileName: file.name || null,
      contentType,
      bytes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể upload ảnh";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
