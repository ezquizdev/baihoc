import type { AuditLogListFilters } from "@/application/infra/db/auditRepo";
import {
  getAuditLogDetail,
  listAuditLogFacets,
  listAuditLogsWithTotal,
} from "@/application/services/auditLogService";

export async function controllerListAuditLogs(filters: AuditLogListFilters) {
  return listAuditLogsWithTotal(filters);
}

export async function controllerGetAuditLogDetail(id: string) {
  return getAuditLogDetail(id);
}

export async function controllerListAuditLogFacets(limit?: number) {
  return listAuditLogFacets(limit ?? 50);
}
