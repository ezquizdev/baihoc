"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AuditLogListItem } from "@/application/models/auditLog";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./audit-logs-table.module.css";

type AuditLogsTableProps = {
  items: AuditLogListItem[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function AuditLogsTable({
  items,
  selectedLogId,
  onSelect,
  isLoading,
  error,
  onRetry,
}: AuditLogsTableProps) {
  const hasItems = items.length > 0;

  const rows = useMemo(() => {
    return items.map((log) => {
      const actorLabel =
        log.actor.fullName ||
        log.actor.email ||
        (log.actor.id ? "Người dùng" : "Hệ thống");
      const targetLabel = buildTargetLabel(log.targetType, log.targetId);
      return {
        ...log,
        actorLabel,
        targetLabel,
        metaSummary: summarizeMetadata(log),
      };
    });
  }, [items]);

  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button
            className={styles.stateAction}
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className={styles.stateCard} aria-live="polite">
        {isLoading ? "Đang tải audit log..." : "Không có sự kiện phù hợp."}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} aria-busy={isLoading}>
      <table className={styles.table} aria-label="Audit log">
        <thead>
          <tr>
            <th scope="col">Thời gian</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Target</th>
            <th scope="col">Gợi ý</th>
            <th scope="col">Mở</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => {
            const selected = log.id === selectedLogId;
            return (
              <tr
                key={log.id}
                className={`${styles.row} ${selected ? styles.rowSelected : ""}`}
                onClick={() => onSelect(log.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(log.id);
                  }
                }}
                tabIndex={0}
                aria-selected={selected}
              >
                <td className={styles.timeCell}>
                  <div className={styles.timePrimary}>
                    {formatRelativeTimeVi(log.createdAt)}
                  </div>
                  <div className={styles.timeMeta}>
                    {formatDateVi(log.createdAt)}
                  </div>
                </td>
                <td className={styles.actorCell}>
                  <div className={styles.actorPrimary}>{log.actorLabel}</div>
                  <div className={styles.actorMeta}>
                    {log.actor.email || (log.actor.id ? log.actor.id : "—")}
                  </div>
                </td>
                <td>
                  <span className={`${styles.pill} ${styles.pillBlue}`}>
                    {log.action}
                  </span>
                </td>
                <td className={styles.targetCell}>{log.targetLabel}</td>
                <td className={styles.metaCell}>{log.metaSummary}</td>
                <td>
                  {log.targetType === "user" && log.targetId ? (
                    <Link
                      className={`${styles.linkBtn} ${styles.linkBtnBlue}`}
                      href={`/profile/${log.targetId}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      User
                    </Link>
                  ) : (
                    <span className={styles.subtle}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildTargetLabel(targetType: string | null, targetId: string | null) {
  if (!targetType && !targetId) return "—";
  if (targetType && targetId) return `${targetType}:${shortId(targetId)}`;
  if (targetType) return targetType;
  return shortId(targetId ?? "");
}

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function summarizeMetadata(log: AuditLogListItem) {
  const action = log.action;
  const targetType = log.targetType;
  if (action === "allowlist_add" || action === "allowlist_remove") {
    return "Allowlist email";
  }
  if (targetType === "user" && log.targetId) {
    return `User ${shortId(log.targetId)}`;
  }
  return "—";
}
