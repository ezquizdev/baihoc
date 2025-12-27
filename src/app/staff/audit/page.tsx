import {
  controllerListAuditLogFacets,
  controllerListAuditLogs,
} from "@/application/controllers/auditLogController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { AuditLogsScreen } from "@/components/audit-logs/audit-logs-screen";

const INITIAL_LIMIT = 30;
const DEFAULT_RANGE_DAYS = 7;

export default async function StaffAuditPage() {
  const session = await requireAuthenticatedPage({
    role: "staff",
    next: "/staff/audit",
  });

  const since = new Date(
    Date.now() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [initial, facets] = await Promise.all([
    controllerListAuditLogs({ since, limit: INITIAL_LIMIT, offset: 0 }),
    controllerListAuditLogFacets(50),
  ]);

  return (
    <AuditLogsScreen
      session={session}
      initialItems={initial.items}
      initialTotal={initial.total}
      initialLimit={INITIAL_LIMIT}
      initialSince={since}
      initialFacets={facets}
    />
  );
}
