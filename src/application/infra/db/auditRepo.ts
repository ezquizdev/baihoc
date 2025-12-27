import type { PoolClient } from "pg";
import { pool, query } from "@/application/infra/db/pool";

export type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown | null;
  created_at: string;
};

export type AuditLogRowWithActor = AuditLogRow & {
  actor_email: string | null;
  actor_full_name: string | null;
};

export type AuditLogListFilters = {
  search?: string;
  action?: string;
  targetType?: string;
  actorUserId?: string;
  targetId?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
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

function buildAuditLogWhere(filters: AuditLogListFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.action) {
    params.push(filters.action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (filters.targetType) {
    params.push(filters.targetType);
    conditions.push(`al.target_type = $${params.length}`);
  }
  if (filters.actorUserId) {
    params.push(filters.actorUserId);
    conditions.push(`al.actor_user_id = $${params.length}::uuid`);
  }
  if (filters.targetId) {
    params.push(filters.targetId);
    conditions.push(`al.target_id = $${params.length}::uuid`);
  }
  if (filters.since) {
    params.push(filters.since);
    conditions.push(`al.created_at >= $${params.length}::timestamptz`);
  }
  if (filters.until) {
    params.push(filters.until);
    conditions.push(`al.created_at <= $${params.length}::timestamptz`);
  }
  const search = filters.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    const searchParam = params.length;
    const includeMetadata = search.length >= 3;
    conditions.push(
      `(
        al.action ILIKE $${searchParam}
        OR COALESCE(al.target_type, '') ILIKE $${searchParam}
        OR COALESCE(u.email, '') ILIKE $${searchParam}
        OR COALESCE(u.full_name, '') ILIKE $${searchParam}
        OR COALESCE(al.target_id::text, '') ILIKE $${searchParam}
        ${includeMetadata ? `OR COALESCE(al.metadata::text, '') ILIKE $${searchParam}` : ""}
      )`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params } as const;
}

export async function listAuditLogs(filters: AuditLogListFilters) {
  const { where, params } = buildAuditLogWhere(filters);
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const res = await query<AuditLogRowWithActor>(
    `SELECT
        al.id,
        al.actor_user_id,
        al.action,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at,
        u.email AS actor_email,
        u.full_name AS actor_full_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return res.rows;
}

export async function countAuditLogs(filters: AuditLogListFilters) {
  const { where, params } = buildAuditLogWhere(filters);
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${where}`,
    params,
  );
  return Number(res.rows[0]?.count ?? 0);
}

export async function findAuditLogById(
  id: string,
  client?: PoolClient,
): Promise<AuditLogRowWithActor | null> {
  const executor = client ?? pool;
  const res = await executor.query<AuditLogRowWithActor>(
    `SELECT
        al.id,
        al.actor_user_id,
        al.action,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at,
        u.email AS actor_email,
        u.full_name AS actor_full_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.id = $1::uuid
      LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function listAuditLogActionFacets(limit = 50) {
  const res = await query<{ action: string; count: string }>(
    `SELECT action, COUNT(*)::text AS count
     FROM audit_logs
     GROUP BY action
     ORDER BY COUNT(*) DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows.map((row) => row.action);
}

export async function listAuditLogTargetTypeFacets(limit = 50) {
  const res = await query<{ target_type: string; count: string }>(
    `SELECT target_type, COUNT(*)::text AS count
     FROM audit_logs
     WHERE target_type IS NOT NULL
     GROUP BY target_type
     ORDER BY COUNT(*) DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows.map((row) => row.target_type);
}
