import { type NextRequest, NextResponse } from "next/server";
import { controllerListAuditLogFacets } from "@/application/controllers/auditLogController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const facets = await controllerListAuditLogFacets(
      Number.isFinite(limit) ? Math.max(1, Math.min(100, limit as number)) : 50,
    );
    return NextResponse.json(facets, { status: 200 });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tải bộ lọc audit log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
