"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardResult } from "@/application/models/leaderboard";
import styles from "./quiz-leaderboard.module.css";

type QuizLeaderboardProps = {
  initial: LeaderboardResult;
  maxRows: number;
  includeSelf: boolean;
  subjectId?: string | null;
  title?: string;
  actionLabel?: string;
  actionHref?: Parameters<typeof Link>[0]["href"];
  onActionClick?: () => void;
  sticky?: boolean;
  className?: string;
};

export function QuizLeaderboard({
  initial,
  maxRows,
  includeSelf,
  subjectId,
  title,
  actionLabel,
  actionHref,
  onActionClick,
  sticky = true,
  className,
}: QuizLeaderboardProps) {
  const didMountRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [data, setData] = useState<LeaderboardResult>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedSubjectId = subjectId ?? null;

  const fetchLeaderboard = useCallback(
    async (nextSubjectId: string | null) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(maxRows));
        if (includeSelf) params.set("includeSelf", "1");
        if (nextSubjectId) params.set("subjectId", nextSubjectId);

        const response = await fetch(`/api/catalog/leaderboard?${params}`, {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Không thể tải leaderboard");
        }

        if (requestIdRef.current === requestId) {
          setData({
            items: Array.isArray(payload?.items) ? payload.items : [],
            self: payload?.self ?? null,
          });
        }
      } catch (err) {
        const aborted =
          controller.signal.aborted || (err as Error).name === "AbortError";
        if (!aborted && requestIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [includeSelf, maxRows],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchLeaderboard(normalizedSubjectId);
  }, [fetchLeaderboard, normalizedSubjectId]);

  const shouldAppendSelf =
    includeSelf &&
    data.self !== null &&
    !data.items.some((entry) => entry.userId === data.self?.userId);

  return (
    <aside
      className={`${styles.card} ${sticky ? styles.cardSticky : ""} ${className ?? ""}`}
      aria-label={title ?? "Leaderboard"}
    >
      {title || actionLabel ? (
        <div className={styles.header}>
          {title ? <h3 className={styles.title}>{title}</h3> : <div />}
          {actionLabel && actionHref ? (
            <Link className={styles.action} href={actionHref}>
              {actionLabel}
            </Link>
          ) : actionLabel && onActionClick ? (
            <button
              type="button"
              className={styles.action}
              onClick={onActionClick}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`${styles.tableWrap} ${loading ? styles.tableWrapLoading : ""}`}
      >
        <table className={styles.table} aria-label="Leaderboard table">
          <thead>
            <tr>
              <th className={styles.colRank}>#</th>
              <th className={styles.colName}>Họ và tên</th>
              <th className={styles.colXp}>XP</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={3} className={styles.stateCell}>
                  <div className={styles.stateError}>{error}</div>
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => fetchLeaderboard(normalizedSubjectId)}
                    disabled={loading}
                  >
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : data.items.length === 0 && !shouldAppendSelf ? (
              <tr>
                <td colSpan={3} className={styles.stateCell}>
                  Chưa có dữ liệu.
                </td>
              </tr>
            ) : (
              <>
                {data.items.map((entry) => (
                  <tr key={entry.userId}>
                    <td className={styles.rank}>{entry.rank}</td>
                    <td>
                      <div className={styles.nameCell}>
                        <LeaderboardBadge rank={entry.rank} />
                        <Link
                          className={styles.nameText}
                          href={`/profile/${entry.userId}`}
                        >
                          {entry.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className={styles.xp}>{formatRawNumber(entry.xp)}</td>
                  </tr>
                ))}

                {shouldAppendSelf ? (
                  <>
                    <tr>
                      <td className={styles.rankEllipsis}>...</td>
                      <td />
                      <td />
                    </tr>
                    <tr className={styles.selfRow}>
                      <td className={styles.rank}>{data.self?.rank}</td>
                      <td>
                        <div className={styles.nameCell}>
                          <LeaderboardBadge
                            rank={data.self?.rank ?? 0}
                            variant="self"
                          />
                          {data.self?.userId ? (
                            <Link
                              className={styles.nameText}
                              href={`/profile/${data.self.userId}`}
                            >
                              {data.self.fullName}
                            </Link>
                          ) : (
                            <span className={styles.nameText}>
                              {data.self?.fullName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.xp}>
                        {formatRawNumber(data.self?.xp ?? 0)}
                      </td>
                    </tr>
                  </>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function LeaderboardBadge({
  rank,
  variant = "top",
}: {
  rank: number;
  variant?: "top" | "self";
}) {
  const isTop = variant === "top";
  const showCrown = isTop && rank === 1;
  return (
    <span
      className={`${styles.badge} ${variant === "self" ? styles.badgeSelf : ""} ${
        showCrown ? styles.badgeCrown : ""
      }`}
      aria-hidden="true"
    >
      <svg
        className={styles.badgeMark}
        width="24"
        height="24"
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

function formatRawNumber(value: number) {
  return String(value);
}
