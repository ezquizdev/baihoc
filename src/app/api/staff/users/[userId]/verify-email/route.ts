import { type NextRequest, NextResponse } from "next/server";
import { controllerAdminVerifyEmail } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

type Params = { userId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const { userId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;
    const user = await controllerAdminVerifyEmail({
      userId,
      actorUserId: session.sub,
      reason,
    });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
