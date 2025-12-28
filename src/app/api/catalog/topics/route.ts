import { NextResponse } from "next/server";
import { parseCommaIds } from "@/app/api/_utils/query";
import { controllerListTopics } from "@/application/controllers/topicController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);

  try {
    const items = await controllerListTopics({
      subjectIds: parseCommaIds(searchParams, "subjectIds"),
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách chủ đề";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
