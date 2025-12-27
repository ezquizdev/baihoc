"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type {
  AttemptHistoryItem,
  AttemptHistoryKind,
} from "@/application/models/attempt";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./attempt-history.module.css";
import { AttemptHistoryCard } from "./attempt-history-card";

type AttemptHistoryScreenProps = {
  session: SessionPayload;
  initialHistory: { items: AttemptHistoryItem[]; total: number };
  pageSize: number;
  initialError?: string | null;
};

const kindOptions: Array<{ value: AttemptHistoryKind; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "practice", label: "Tự luyện" },
  { value: "challenge", label: "Challenge" },
  { value: "custom", label: "Quiz tự tạo" },
];

export function AttemptHistoryScreen({
  session,
  initialHistory,
  pageSize,
  initialError = null,
}: AttemptHistoryScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [kind, setKind] = useState<AttemptHistoryKind>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialHistory.items);
  const [total, setTotal] = useState(initialHistory.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialLoadRef = useRef(true);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [pageSize, total],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      if (!initialError) return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        if (refreshKey > 0) {
          params.set("_refresh", String(refreshKey));
        }
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        }
        if (kind !== "all") {
          params.set("kind", kind);
        }

        const response = await fetch(`/api/attempts?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Không thể tải lịch sử làm bài");
        }
        const payload = await response.json();
        setItems(payload.items ?? []);
        setTotal(payload.total ?? 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };
    run();

    return () => controller.abort();
  }, [debouncedSearch, initialError, kind, page, pageSize, refreshKey]);

  const handleKindChange = (next: AttemptHistoryKind) => {
    setKind(next);
    setPage(1);
  };

  const handleRetry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const statusLabel = loading
    ? "Đang tải..."
    : error
      ? "Không thể tải"
      : total > 0
        ? `${formatNumberVi(total)} lượt`
        : "Chưa có dữ liệu";
  const hasActiveFilters = kind !== "all" || search.trim().length > 0;

  return (
    <DashboardShell
      pageTitle="Lịch sử"
      activeNav="history"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchValue={search}
      searchName="search"
      searchPlaceholder="Tìm theo tên quiz"
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onSearchSubmit={(value) => {
        setSearch(value);
        setPage(1);
      }}
    >
      <div className={styles.page}>
        <section className={styles.summaryRow} aria-label="Tóm tắt lịch sử">
          <div className={styles.summaryText}>
            Xem lại các bài đã hoàn thành, điểm tổng và điểm theo từng môn.
            <br />
            Mẹo: dùng ô tìm kiếm để lọc nhanh theo tên quiz.
          </div>
          <div className={styles.summaryMetrics}>
            <div className={styles.summaryCount}>{formatNumberVi(total)}</div>
            <div className={styles.summaryMeta}>lượt làm đã nộp</div>
          </div>
        </section>

        <section className={styles.filtersRow} aria-label="Bộ lọc">
          <div
            className={styles.filterPills}
            role="tablist"
            aria-label="Loại quiz"
          >
            {kindOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterPill} ${
                  kind === option.value ? styles.filterPillActive : ""
                }`}
                role="tab"
                aria-selected={kind === option.value}
                onClick={() => handleKindChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.statusPill} aria-live="polite">
            <span
              className={`${styles.dot} ${loading ? styles.dotLoading : ""}`}
              aria-hidden="true"
            />
            {statusLabel}
          </div>
        </section>

        {error ? (
          <div className={styles.emptyCard} role="alert">
            Không thể tải lịch sử. {error}
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
              >
                Thử lại
              </button>
              <Link className={styles.ghostButton} href="/quizzes">
                Về danh sách quiz
              </Link>
            </div>
          </div>
        ) : items.length === 0 && !loading ? (
          <div className={styles.emptyCard}>
            {hasActiveFilters ? (
              <>
                Không tìm thấy lượt làm phù hợp với bộ lọc hiện tại. Hãy thử đổi
                từ khoá tìm kiếm hoặc xoá bộ lọc.
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => {
                      setKind("all");
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    Xoá bộ lọc
                  </button>
                  <Link className={styles.retryButton} href="/quizzes">
                    Khám phá quiz
                  </Link>
                </div>
              </>
            ) : (
              <>
                Bạn chưa có lượt làm nào được nộp. Hãy bắt đầu với một quiz
                trong danh sách.
                <div className={styles.emptyActions}>
                  <Link className={styles.retryButton} href="/quizzes">
                    Khám phá quiz
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <section className={styles.list} aria-label="Danh sách lượt làm">
            {items.map((item) => (
              <AttemptHistoryCard key={item.attemptId} item={item} />
            ))}
          </section>
        )}

        <QuizPagination
          page={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </DashboardShell>
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
