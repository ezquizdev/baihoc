"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { AuditLogListItem } from "@/application/models/auditLog";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { AuditLogDetailPanel } from "./audit-log-detail-panel";
import {
  type AuditLogsFacets,
  AuditLogsFilters,
  type AuditLogsTimeRange,
} from "./audit-logs-filters";
import styles from "./audit-logs-screen.module.css";
import { AuditLogsTable } from "./audit-logs-table";

type AuditLogsScreenProps = {
  session: SessionPayload;
  initialItems: AuditLogListItem[];
  initialTotal: number;
  initialLimit: number;
  initialSince: string;
  initialFacets: AuditLogsFacets;
};

export function AuditLogsScreen({
  session,
  initialItems,
  initialTotal,
  initialLimit,
  initialSince,
  initialFacets,
}: AuditLogsScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];

  const pageSize = initialLimit;
  const [timeRange, setTimeRange] = useState<AuditLogsTimeRange>("7d");
  const [since, setSince] = useState<string | null>(initialSince);
  const [action, setAction] = useState<string>("all");
  const [targetType, setTargetType] = useState<string>("all");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditLogListItem[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );

  const [facets, setFacets] = useState<AuditLogsFacets>(initialFacets);

  const didMountRange = useRef(false);
  useEffect(() => {
    if (!didMountRange.current) {
      didMountRange.current = true;
      return;
    }
    if (timeRange === "all") {
      setSince(null);
      return;
    }
    const ms =
      timeRange === "24h"
        ? 24 * 60 * 60 * 1000
        : timeRange === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;
    setSince(new Date(Date.now() - ms).toISOString());
  }, [timeRange]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        if (since) params.set("since", since);
        if (action !== "all") params.set("action", action);
        if (targetType !== "all") params.set("targetType", targetType);
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        params.set("_", String(refreshKey));

        const response = await fetch(`/api/staff/audit-logs?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải audit log");
        }
        const payload = await response.json();
        setItems(
          Array.isArray(payload.items)
            ? (payload.items as AuditLogListItem[])
            : [],
        );
        setTotal(Number(payload.total ?? 0));
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
  }, [action, debouncedSearch, page, pageSize, refreshKey, since, targetType]);

  useEffect(() => {
    if (!items.length) {
      setSelectedLogId(null);
      return;
    }
    if (!selectedLogId) {
      setSelectedLogId(items[0].id);
      return;
    }
    const stillVisible = items.some((item) => item.id === selectedLogId);
    if (!stillVisible) setSelectedLogId(items[0].id);
  }, [items, selectedLogId]);

  useEffect(() => {
    setFacets(initialFacets);
  }, [initialFacets]);

  const caption = useMemo(() => {
    if (total <= 0) return "0 sự kiện";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}-${end} / ${total} sự kiện`;
  }, [page, pageSize, total]);

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleRefreshFacets = async () => {
    try {
      const res = await fetch("/api/staff/audit-logs/meta?limit=50");
      if (!res.ok) return;
      const payload = (await res.json()) as AuditLogsFacets;
      if (
        payload &&
        Array.isArray(payload.actions) &&
        Array.isArray(payload.targetTypes)
      ) {
        setFacets(payload);
      }
    } catch {
      // ignore
    }
  };

  return (
    <StaffShell
      pageTitle=""
      activeNav="audit"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onSearchSubmit={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Tìm theo action / actor / target / metadata"
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Nhật ký hệ thống</h1>
            <p className={styles.heroText}>
              Theo dõi các thao tác quản trị: cập nhật người dùng, allowlist,
              xác minh email, reset mật khẩu…
            </p>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={handleRefreshFacets}
            >
              Làm mới bộ lọc
            </button>
          </div>
        </section>

        <AuditLogsFilters
          facets={facets}
          timeRange={timeRange}
          onTimeRangeChange={(next) => {
            setTimeRange(next);
            setPage(1);
          }}
          action={action}
          onActionChange={(next) => {
            setAction(next);
            setPage(1);
          }}
          targetType={targetType}
          onTargetTypeChange={(next) => {
            setTargetType(next);
            setPage(1);
          }}
          onReset={() => {
            setTimeRange("7d");
            setAction("all");
            setTargetType("all");
            setSearch("");
            setPage(1);
          }}
        />

        <div className={styles.content}>
          <section className={`cardBase ${styles.listCard}`} aria-label="List">
            <div className={styles.listHead}>
              <h2 className={styles.listTitle}>Sự kiện</h2>
              <span className={styles.subtle}>{caption}</span>
            </div>

            <AuditLogsTable
              items={items}
              selectedLogId={selectedLogId}
              onSelect={setSelectedLogId}
              isLoading={loading}
              error={error}
              onRetry={handleRetry}
            />

            <QuizPagination
              page={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </section>

          <section
            className={`cardBase ${styles.detailCard}`}
            aria-label="Detail"
          >
            <AuditLogDetailPanel logId={selectedLogId} />
          </section>
        </div>
      </div>
    </StaffShell>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
