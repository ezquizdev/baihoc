"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AuditLogDetail } from "@/application/models/auditLog";
import { TextAreaModal } from "@/components/ui/text-area-modal";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./audit-log-detail-panel.module.css";

type AuditLogDetailPanelProps = {
  logId: string | null;
};

type Notice = { tone: "success" | "error"; message: string };

export function AuditLogDetailPanel({ logId }: AuditLogDetailPanelProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copyFallback, setCopyFallback] = useState<{
    title: string;
    message: string;
    value: string;
  } | null>(null);

  useEffect(() => {
    setLog(null);
    setError(null);
    setNotice(null);
    setCopyFallback(null);
    setLoading(false);
    if (!logId) return;
  }, [logId]);

  useEffect(() => {
    if (!logId) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/staff/audit-logs/${logId}?_=${String(refreshKey)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải audit log");
        }
        const payload = await response.json();
        setLog((payload?.log ?? null) as AuditLogDetail | null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Không thể tải audit log",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [logId, refreshKey]);

  const title = useMemo(() => {
    if (!logId) return "Chi tiết";
    if (!log) return "Đang tải...";
    return log.action;
  }, [log, logId]);

  const actorLabel = useMemo(() => {
    if (!log) return "—";
    return (
      log.actor.fullName ||
      log.actor.email ||
      (log.actor.id ? "Người dùng" : "Hệ thống")
    );
  }, [log]);

  const targetLabel = useMemo(() => {
    if (!log) return "—";
    if (!log.targetType && !log.targetId) return "—";
    if (log.targetType && log.targetId)
      return `${log.targetType}:${log.targetId}`;
    return log.targetType ?? log.targetId ?? "—";
  }, [log]);

  const metadataText = useMemo(() => {
    if (!log) return "";
    if (log.metadata === null || log.metadata === undefined) return "";
    try {
      return JSON.stringify(log.metadata, null, 2);
    } catch {
      return String(log.metadata);
    }
  }, [log]);

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: "success", message: successMessage });
    } catch {
      setCopyFallback({
        title: "Copy thủ công",
        message: "Không thể copy tự động. Hãy copy nội dung bên dưới.",
        value,
      });
    }
  };

  if (!logId) {
    return (
      <div className={styles.empty} aria-live="polite">
        Chọn một sự kiện trong bảng để xem chi tiết.
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button
            className={styles.stateAction}
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} aria-busy={loading}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.subtitle}>{logId}</div>
        </div>
      </div>

      {notice ? (
        <div
          className={`${styles.notice} ${
            notice.tone === "success"
              ? styles.noticeSuccess
              : styles.noticeError
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => copyText(logId, "Đã copy log id.")}
        >
          Copy ID
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          disabled={!metadataText}
          onClick={() => copyText(metadataText, "Đã copy metadata JSON.")}
        >
          Copy metadata
        </button>
      </div>

      <TextAreaModal
        open={copyFallback !== null}
        title={copyFallback?.title ?? ""}
        message={copyFallback?.message}
        value={copyFallback?.value ?? ""}
        primaryLabel="Đóng"
        autoSelect
        onClose={() => setCopyFallback(null)}
        onPrimary={() => setCopyFallback(null)}
      />

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Tóm tắt</h4>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Thời gian</span>
            <div className={styles.fieldValue}>
              {log ? formatRelativeTimeVi(log.createdAt) : "—"} (
              {formatDateVi(log?.createdAt)})
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Actor</span>
            <div className={styles.fieldValue}>{actorLabel}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Action</span>
            <div className={styles.fieldValue}>{log?.action ?? "—"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Target</span>
            <div className={styles.fieldValue}>{targetLabel}</div>
          </div>
        </div>

        <div className={styles.linksRow}>
          {log?.actor.id ? (
            <Link
              className={styles.linkBtnBlue}
              href={`/profile/${log.actor.id}`}
            >
              Mở actor
            </Link>
          ) : (
            <span />
          )}
          {log?.targetType === "user" && log.targetId ? (
            <Link
              className={styles.linkBtnBlue}
              href={`/profile/${log.targetId}`}
            >
              Mở target user
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Metadata</h4>
        {metadataText ? (
          <pre className={styles.code}>{metadataText}</pre>
        ) : (
          <div className={styles.emptySmall}>Không có metadata.</div>
        )}
      </div>
    </div>
  );
}
