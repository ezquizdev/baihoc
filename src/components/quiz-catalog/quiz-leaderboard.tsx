"use client";

import type { LeaderboardEntry } from "@/application/models/leaderboard";
import styles from "./quiz-catalog.module.css";

type QuizLeaderboardProps = {
  items: LeaderboardEntry[];
};

export function QuizLeaderboard({ items }: QuizLeaderboardProps) {
  return (
    <aside
      className={`${styles.card} ${styles.leaderboard}`}
      aria-label="Leaderboard"
    >
      <div className={styles.sectionHead}>
        <h3>Bảng xếp hạng</h3>
        <a href="#">Xem tất cả</a>
      </div>

      <table className={styles.leaderboardTable} aria-label="Leaderboard table">
        <thead>
          <tr>
            <th style={{ width: "44px" }}>#</th>
            <th>Họ và tên</th>
            <th style={{ width: "78px", textAlign: "right" }}>XP</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((entry, index) => (
              <tr key={entry.userId}>
                <td className={styles.rank}>{index + 1}</td>
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.tinyAvatar} aria-hidden="true" />
                    {entry.fullName}
                  </div>
                </td>
                <td className={styles.xp}>{formatNumber(entry.xp)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>Chưa có dữ liệu.</td>
            </tr>
          )}
        </tbody>
      </table>
    </aside>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}
