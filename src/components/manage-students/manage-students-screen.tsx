"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { UserAdminSummary } from "@/application/models/userAdmin";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import {
  ManageStudentsFilters,
  type StudentStatusFilter,
  type StudentTierFilter,
} from "./manage-students-filters";
import styles from "./manage-students-screen.module.css";
import { StudentDetailPanel } from "./student-detail-panel";
import { StudentTable } from "./student-table";

type ManageStudentsScreenProps = {
  session: SessionPayload;
  initialItems: UserAdminSummary[];
  initialTotal: number;
  initialLimit: number;
};

export function ManageStudentsScreen({
  session,
  initialItems,
  initialTotal,
  initialLimit,
}: ManageStudentsScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [status, setStatus] = useState<StudentStatusFilter>("active");
  const [tier, setTier] = useState<StudentTierFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<UserAdminSummary[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );

  const pageSize = initialLimit;

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("role", "student");
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        if (status !== "all") params.set("status", status);
        if (tier !== "all") params.set("tier", tier);
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        params.set("_", String(refreshKey));

        const response = await fetch(`/api/staff/users?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải danh sách học sinh");
        }
        const payload = await response.json();
        setItems(
          Array.isArray(payload.items)
            ? (payload.items as UserAdminSummary[])
            : [],
        );
        setTotal(Number(payload.total ?? 0));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách học sinh",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [debouncedSearch, page, pageSize, refreshKey, status, tier]);

  useEffect(() => {
    if (!items.length) {
      setSelectedUserId(null);
      return;
    }
    if (!selectedUserId) {
      setSelectedUserId(items[0].id);
      return;
    }
    const stillVisible = items.some((item) => item.id === selectedUserId);
    if (!stillVisible) {
      setSelectedUserId(items[0].id);
    }
  }, [items, selectedUserId]);

  const caption = useMemo(() => {
    if (total <= 0) return "0 học sinh";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}-${end} / ${total} học sinh`;
  }, [page, pageSize, total]);

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMutated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <StaffShell
      activeNav="students"
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
      searchPlaceholder="Tìm học sinh"
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Học sinh</h1>
            <p className={styles.heroText}>
              Tìm kiếm và quản lý trạng thái tài khoản học sinh, gói học, xác
              minh email và lịch sử thay đổi.
            </p>
          </div>
        </section>

        <ManageStudentsFilters
          status={status}
          onStatusChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          tier={tier}
          onTierChange={(next) => {
            setTier(next);
            setPage(1);
          }}
        />

        <div className={styles.content}>
          <section className={`cardBase ${styles.listCard}`} aria-label="List">
            <div className={styles.listHead}>
              <h2 className={styles.listTitle}>Danh sách học sinh</h2>
              <span className={styles.subtle}>{caption}</span>
            </div>

            <StudentTable
              items={items}
              selectedUserId={selectedUserId}
              onSelect={setSelectedUserId}
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
            <StudentDetailPanel
              userId={selectedUserId}
              onMutated={handleMutated}
            />
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
