import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";

export type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
};

/**
 * Records an auditable event. Keep payloads small; callers own redaction.
 */
export async function insertAuditLog(
  input: AuditLogInput,
  client?: PoolClient,
) {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.actorUserId ?? null,
      input.action,
      input.targetType ?? null,
      input.targetId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}
