import { NextResponse } from "next/server";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const items = await controllerListSubjects();
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách môn học";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
