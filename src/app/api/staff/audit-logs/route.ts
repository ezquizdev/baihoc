import { type NextRequest, NextResponse } from "next/server";
import { parsePagination } from "@/app/api/_utils/query";
import { controllerListAuditLogs } from "@/application/controllers/auditLogController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseDateParam(value: string | null) {
  if (!value) return undefined;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(
    url.searchParams,
    { limit: 30, offset: 0 },
    100,
  );

  const search = url.searchParams.get("search")?.trim() || undefined;
  const action = url.searchParams.get("action")?.trim() || undefined;
  const targetType = url.searchParams.get("targetType")?.trim() || undefined;
  const actorUserId = url.searchParams.get("actorUserId")?.trim() || undefined;
  const targetId = url.searchParams.get("targetId")?.trim() || undefined;

  if (actorUserId && !isUuid(actorUserId)) {
    return NextResponse.json(
      { error: "actorUserId không hợp lệ" },
      { status: 400 },
    );
  }
  if (targetId && !isUuid(targetId)) {
    return NextResponse.json(
      { error: "targetId không hợp lệ" },
      { status: 400 },
    );
  }

  const since = parseDateParam(url.searchParams.get("since"));
  if (since === null) {
    return NextResponse.json({ error: "since không hợp lệ" }, { status: 400 });
  }
  const until = parseDateParam(url.searchParams.get("until"));
  if (until === null) {
    return NextResponse.json({ error: "until không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await controllerListAuditLogs({
      search,
      action,
      targetType,
      actorUserId,
      targetId,
      since,
      until,
      limit,
      offset,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Không thể tải audit log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
