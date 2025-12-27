import type { AuditLogListFilters } from "@/application/infra/db/auditRepo";
import {
  countAuditLogs,
  findAuditLogById,
  listAuditLogActionFacets,
  listAuditLogs,
  listAuditLogTargetTypeFacets,
} from "@/application/infra/db/auditRepo";
import type {
  AuditLogDetail,
  AuditLogListItem,
} from "@/application/models/auditLog";
import { ServiceError } from "@/application/services/errors";

function toAuditLogItem(row: {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_full_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}): AuditLogListItem {
  return {
    id: row.id,
    actor: {
      id: row.actor_user_id,
      email: row.actor_email,
      fullName: row.actor_full_name,
    },
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at,
  };
}

export async function listAuditLogsWithTotal(filters: AuditLogListFilters) {
  const [rows, total] = await Promise.all([
    listAuditLogs(filters),
    countAuditLogs(filters),
  ]);
  return { items: rows.map(toAuditLogItem), total };
}

export async function getAuditLogDetail(id: string): Promise<AuditLogDetail> {
  const row = await findAuditLogById(id);
  if (!row) {
    throw new ServiceError("audit_log_not_found", "Audit log not found", 404);
  }
  return {
    ...toAuditLogItem(row),
    metadata: row.metadata ?? null,
  };
}

export async function listAuditLogFacets(limit = 50) {
  const [actions, targetTypes] = await Promise.all([
    listAuditLogActionFacets(limit),
    listAuditLogTargetTypeFacets(limit),
  ]);
  return { actions, targetTypes };
}
