"use client";

import Link from "next/link";
import { CaretDown, CaretUp } from "phosphor-react";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type {
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableEntry,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./dashboard-leaderboard-screen.module.css";

type DashboardLeaderboardScreenProps = {
  session: SessionPayload;
  initial: LeaderboardTableResult;
  pageSize: number;
  navItems?: ComponentProps<typeof DashboardShell>["navItems"];
};

const scoreColumns: Array<{
  key: LeaderboardSortBy;
  label: string;
  shortLabel: string;
}> = [
  { key: "vi", label: "Tiếng Việt", shortLabel: "TV" },
  { key: "en", label: "Tiếng Anh", shortLabel: "TA" },
  { key: "math", label: "Toán", shortLabel: "Toán" },
  { key: "sci", label: "Khoa học", shortLabel: "KH" },
  { key: "overall", label: "Tổng", shortLabel: "Tổng" },
];

export function DashboardLeaderboardScreen({
  session,
  initial,
  pageSize,
  navItems,
}: DashboardLeaderboardScreenProps) {
  const didMountRef = useRef(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchEntries, setSearchEntries] = useState<LeaderboardTableEntry[]>(
    [],
  );
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>("overall");
  const [sortDir, setSortDir] = useState<LeaderboardSortDir>("desc");
  const [items, setItems] = useState<LeaderboardTableEntry[]>(initial.items);
  const [total, setTotal] = useState<number>(initial.total);
  const [self, setSelf] = useState<LeaderboardTableEntry | null>(initial.self);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        params.set("includeSelf", "1");
        params.set("_", String(refreshKey));

        const response = await fetch(
          `/api/catalog/leaderboard/table?${params}`,
          {
            signal: controller.signal,
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? "Không thể tải leaderboard");
        }

        setItems(Array.isArray(payload.items) ? payload.items : []);
        setTotal(Number(payload.total ?? 0));
        setSelf(payload.self ?? null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Không thể tải leaderboard",
        );
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [page, pageSize, refreshKey, sortBy, sortDir]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (!trimmed) {
      setSearchEntries([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        if (searchRefreshKey > 0) {
          params.set("_", String(searchRefreshKey));
        }

        const response = await fetch(
          `/api/catalog/leaderboard/table/search?${params}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? "Không thể tìm xếp hạng");
        }

        setSearchEntries(Array.isArray(payload.items) ? payload.items : []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchEntries([]);
        setSearchError(
          err instanceof Error ? err.message : "Không thể tìm xếp hạng",
        );
      } finally {
        setSearchLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [debouncedSearch, searchRefreshKey, sortBy, sortDir]);

  const displayName = session.fullName ?? session.email.split("@")[0];

  const caption = useMemo(() => {
    if (total <= 0) return "0 học sinh";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}-${end} / ${formatNumberVi(total)} học sinh`;
  }, [page, pageSize, total]);

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleSearchClear = () => {
    setSearch("");
    setSearchEntries([]);
    setSearchError(null);
    setSearchLoading(false);
  };

  const handleSearchRetry = () => {
    setSearchRefreshKey((prev) => prev + 1);
  };

  const handleSortToggle = (key: LeaderboardSortBy) => {
    setPage(1);
    setSortDir((prev) =>
      key === sortBy ? (prev === "desc" ? "asc" : "desc") : "desc",
    );
    setSortBy(key);
  };

  const shouldAppendSelf = self !== null;

  return (
    <DashboardShell
      pageTitle=""
      activeNav="leaderboard"
      navItems={navItems}
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchValue={search}
      searchPlaceholder="Tìm học sinh theo tên"
      onSearchChange={setSearch}
      onSearchSubmit={setSearch}
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Bảng xếp hạng</h1>
            <p className={styles.heroSubtitle}>
              Sắp xếp theo từng môn hoặc tổng điểm để theo dõi tiến độ học tập.
            </p>
          </div>
        </section>

        <section className={`cardBase ${styles.card}`} aria-label="Leaderboard">
          <div className={styles.cardHeader}>
            <div>
              {/*<h2 className={styles.cardTitle}>Xếp hạng học sinh</h2>*/}
              <span className={styles.caption}>{caption}</span>
            </div>
          </div>

          {search.trim().length > 0 ? (
            <section
              className={styles.searchResult}
              aria-label="Kết quả tìm kiếm"
            >
              <div className={styles.searchResultHeader}>
                <div className={styles.searchResultTitle}>
                  Kết quả cho{" "}
                  <span className={styles.searchQuery}>"{search.trim()}"</span>
                </div>
                <div className={styles.searchResultActions}>
                  {searchError ? (
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={handleSearchRetry}
                      disabled={searchLoading}
                    >
                      Thử lại
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.retryButton} ${styles.searchClearButton}`}
                    onClick={handleSearchClear}
                    disabled={searchLoading}
                  >
                    Xoá
                  </button>
                </div>
              </div>

              {searchLoading ? (
                <div className={styles.searchState} aria-live="polite">
                  Đang tìm...
                </div>
              ) : searchError ? (
                <div
                  className={`${styles.searchState} ${styles.searchStateError}`}
                  role="alert"
                >
                  {searchError}
                </div>
              ) : searchEntries.length > 0 ? (
                <div className={styles.searchRows}>
                  {searchEntries.map((entry) => (
                    <div key={entry.userId} className={styles.searchRow}>
                      <div className={styles.searchIdentity}>
                        <div className={styles.searchRank}>#{entry.rank}</div>
                        <LeaderboardBadge
                          rank={entry.rank}
                          variant={
                            entry.userId === session.sub ? "self" : "top"
                          }
                        />
                        <Link
                          className={styles.searchName}
                          href={`/profile/${entry.userId}`}
                        >
                          {entry.fullName}
                        </Link>
                      </div>

                      <div className={styles.searchScores}>
                        <ScorePill label="TV" value={entry.xpVi} />
                        <ScorePill label="TA" value={entry.xpEn} />
                        <ScorePill label="Toán" value={entry.xpMath} />
                        <ScorePill label="KH" value={entry.xpSci} />
                        <ScorePill
                          label="Tổng"
                          value={entry.xpOverall}
                          variant="overall"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.searchState} aria-live="polite">
                  Không tìm thấy học sinh phù hợp trong bảng xếp hạng.
                </div>
              )}
            </section>
          ) : null}

          <div
            className={`${styles.tableWrap} ${loading ? styles.tableWrapLoading : ""}`}
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Bảng xếp hạng (có phân trang và sắp xếp)
              </caption>
              <thead>
                <tr>
                  <th className={styles.colRank}>#</th>
                  <th className={styles.colName}>Họ và tên</th>
                  {scoreColumns.map((col) => {
                    const isActive = sortBy === col.key;
                    const ariaSort = isActive
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";
                    return (
                      <th
                        key={col.key}
                        className={styles.colScore}
                        aria-sort={
                          ariaSort as "ascending" | "descending" | "none"
                        }
                      >
                        <button
                          type="button"
                          className={`${styles.sortButton} ${
                            isActive ? styles.sortButtonActive : ""
                          }`}
                          onClick={() => handleSortToggle(col.key)}
                          disabled={loading}
                          title={`Sắp xếp theo ${col.label}`}
                        >
                          <span className={styles.sortLabelFull}>
                            {col.label}
                          </span>
                          <span className={styles.sortLabelShort}>
                            {col.shortLabel}
                          </span>
                          <span className={styles.sortIcon} aria-hidden="true">
                            {isActive ? (
                              sortDir === "asc" ? (
                                <CaretUp weight="bold" size={16} />
                              ) : (
                                <CaretDown weight="bold" size={16} />
                              )
                            ) : (
                              <>
                                <CaretUp size={12} />
                                <CaretDown size={12} />
                              </>
                            )}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <td colSpan={7} className={styles.stateCell}>
                      <div className={styles.stateError}>{error}</div>
                      <button
                        type="button"
                        className={styles.retryButton}
                        onClick={handleRetry}
                        disabled={loading}
                      >
                        Thử lại
                      </button>
                    </td>
                  </tr>
                ) : items.length === 0 && !shouldAppendSelf ? (
                  <tr>
                    <td colSpan={7} className={styles.stateCell}>
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((entry) => (
                      <LeaderboardRow key={entry.userId} entry={entry} />
                    ))}

                    {shouldAppendSelf ? (
                      <>
                        <tr>
                          <td className={styles.rankEllipsis}>...</td>
                          <td colSpan={6} />
                        </tr>
                        {self ? (
                          <LeaderboardRow entry={self} variant="self" />
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <QuizPagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function LeaderboardRow({
  entry,
  variant = "default",
}: {
  entry: LeaderboardTableEntry;
  variant?: "default" | "self";
}) {
  const isSelf = variant === "self";
  const topClass =
    entry.rank === 1
      ? styles.top1
      : entry.rank === 2
        ? styles.top2
        : entry.rank === 3
          ? styles.top3
          : "";

  return (
    <tr className={`${styles.row} ${topClass} ${isSelf ? styles.selfRow : ""}`}>
      <td className={styles.rank}>{entry.rank}</td>
      <td className={styles.nameCell}>
        <LeaderboardBadge rank={entry.rank} variant={isSelf ? "self" : "top"} />
        <Link className={styles.nameText} href={`/profile/${entry.userId}`}>
          {entry.fullName}
        </Link>
      </td>
      <td className={styles.score}>{formatNumberVi(entry.xpVi)}</td>
      <td className={styles.score}>{formatNumberVi(entry.xpEn)}</td>
      <td className={styles.score}>{formatNumberVi(entry.xpMath)}</td>
      <td className={styles.score}>{formatNumberVi(entry.xpSci)}</td>
      <td className={`${styles.score} ${styles.scoreOverall}`}>
        {formatNumberVi(entry.xpOverall)}
      </td>
    </tr>
  );
}

function LeaderboardBadge({
  rank,
  variant = "top",
}: {
  rank: number;
  variant?: "top" | "self";
}) {
  const showCrown = variant === "top" && rank === 1;
  return (
    <span
      className={`${styles.badge} ${variant === "self" ? styles.badgeSelf : ""} ${
        showCrown ? styles.badgeCrown : ""
      }`}
      aria-hidden="true"
    >
      <svg
        className={styles.badgeMark}
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 6.5c0-.83.67-1.5 1.5-1.5H10v6H4V6.5ZM14 5h4.5c.83 0 1.5.67 1.5 1.5V11h-6V5Z"
          fill="currentColor"
        />
        <path
          d="M7.2 11.2h9.6v3.2c0 2.65-2.15 4.8-4.8 4.8s-4.8-2.15-4.8-4.8v-3.2Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function ScorePill({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "overall";
}) {
  return (
    <div
      className={`${styles.scorePill} ${
        variant === "overall" ? styles.scorePillOverall : ""
      }`}
    >
      <span className={styles.scorePillLabel}>{label}</span>
      <span className={styles.scorePillValue}>{formatNumberVi(value)}</span>
    </div>
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
