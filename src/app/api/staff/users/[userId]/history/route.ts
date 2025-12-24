import { type NextRequest, NextResponse } from "next/server";
import { controllerAdminUserHistory } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

type Params = { userId: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const { userId } = await context.params;
    const history = await controllerAdminUserHistory(userId);
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
