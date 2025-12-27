import { type NextRequest, NextResponse } from "next/server";
import { controllerGetAuditLogDetail } from "@/application/controllers/auditLogController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";

type Params = { auditLogId: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const { auditLogId } = await context.params;
  if (!isUuid(auditLogId)) {
    return NextResponse.json(
      { error: "Audit log id không hợp lệ" },
      { status: 400 },
    );
  }

  try {
    const log = await controllerGetAuditLogDetail(auditLogId);
    return NextResponse.json({ log }, { status: 200 });
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
