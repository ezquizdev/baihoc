import Image from "next/image";
import Link from "next/link";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./leaderboard-card.module.css";

type LeaderboardRow = {
  rank: number;
  name: string;
  xp: number;
  avatarUrl?: string | null;
  href?: Parameters<typeof Link>[0]["href"];
};

type LeaderboardCardProps = {
  title: string;
  actionLabel?: string;
  actionHref?: Parameters<typeof Link>[0]["href"];
  onActionClick?: () => void;
  rows: LeaderboardRow[];
  className?: string;
  scoreHeader?: string;
};

export function LeaderboardCard({
  title,
  actionLabel,
  actionHref,
  onActionClick,
  rows,
  className,
  scoreHeader = "XP",
}: LeaderboardCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
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

      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label="Bảng xếp hạng">
          <thead>
            <tr>
              <th style={{ width: "56px" }}>#</th>
              <th>Họ và tên</th>
              <th style={{ width: "120px", textAlign: "right" }}>
                {scoreHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rank}>
                <td className={styles.rank}>{row.rank}</td>
                <td>
                  <div className={styles.nameCell}>
                    <div
                      className={`${styles.avatar} ${row.avatarUrl ? styles.avatarHasImage : ""}`}
                      aria-hidden="true"
                    >
                      {row.avatarUrl ? (
                        <Image
                          src={row.avatarUrl}
                          alt="Avatar"
                          fill
                          sizes="32px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                    {row.href ? (
                      <Link className={styles.nameLink} href={row.href}>
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                  </div>
                </td>
                <td className={styles.xp}>{formatNumberVi(row.xp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
