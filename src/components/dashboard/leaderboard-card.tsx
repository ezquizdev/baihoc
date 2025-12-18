import Image from "next/image";
import styles from "./leaderboard-card.module.css";

type LeaderboardRow = {
  rank: number;
  name: string;
  xp: number;
  avatarUrl?: string | null;
};

type LeaderboardCardProps = {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  rows: LeaderboardRow[];
  className?: string;
};

export function LeaderboardCard({
  title,
  actionLabel,
  onActionClick,
  rows,
  className,
}: LeaderboardCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {actionLabel ? (
          <button
            type="button"
            className={styles.action}
            onClick={onActionClick}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <table className={styles.table} aria-label="Bảng xếp hạng">
        <thead>
          <tr>
            <th style={{ width: "56px" }}>#</th>
            <th>Họ và tên</th>
            <th style={{ width: "90px", textAlign: "right" }}>XP</th>
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
                  {row.name}
                </div>
              </td>
              <td className={styles.xp}>{row.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
