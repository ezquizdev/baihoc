"use client";

import { CaretDown, CaretUp } from "phosphor-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
}: DashboardLeaderboardScreenProps) {
  const didMountRef = useRef(false);
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
      pageTitle="Bảng xếp hạng"
      activeNav="leaderboard"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
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
              <h2 className={styles.cardTitle}>Xếp hạng học sinh</h2>
              <span className={styles.caption}>{caption}</span>
            </div>
          </div>

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
        <span className={styles.nameText}>{entry.fullName}</span>
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
