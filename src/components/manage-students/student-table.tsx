"use client";

import Link from "next/link";
import type { UserAdminSummary } from "@/application/models/userAdmin";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./student-table.module.css";

type StudentTableProps = {
  items: UserAdminSummary[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function StudentTable({
  items,
  selectedUserId,
  onSelect,
  isLoading,
  error,
  onRetry,
}: StudentTableProps) {
  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button
            className={styles.stateAction}
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.stateCard} aria-live="polite">
        {isLoading ? "Đang tải học sinh..." : "Không có học sinh phù hợp."}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap} aria-busy={isLoading}>
      <table className={styles.table} aria-label="Danh sách học sinh">
        <thead>
          <tr>
            <th scope="col">Học sinh</th>
            <th scope="col">Gói</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Email</th>
            <th scope="col">Hồ sơ</th>
            <th scope="col">Đăng nhập</th>
            <th scope="col">Ngày tạo</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => {
            const selected = user.id === selectedUserId;
            return (
              <tr
                key={user.id}
                className={`${styles.row} ${selected ? styles.rowSelected : ""}`}
                onClick={() => onSelect(user.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(user.id);
                  }
                }}
                tabIndex={0}
                aria-selected={selected}
              >
                <td className={styles.studentCell}>
                  <div className={styles.studentName}>
                    {user.fullName || user.email}
                  </div>
                  <div className={styles.studentMeta}>{user.email}</div>
                </td>
                <td>
                  <span
                    className={`${styles.pill} ${
                      user.tier === "paid" ? styles.pillBlue : styles.pillGray
                    }`}
                  >
                    {tierLabel(user.tier)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.pill} ${statusToneClass(
                      user.status,
                      styles,
                    )}`}
                  >
                    {statusLabel(user.status)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.pill} ${
                      user.emailVerifiedAt ? styles.pillBlue : styles.pillGray
                    }`}
                  >
                    {user.emailVerifiedAt ? "Đã xác minh" : "Chưa xác minh"}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.pill} ${
                      user.profileCompleted ? styles.pillBlue : styles.pillGray
                    }`}
                  >
                    {user.profileCompleted ? "Đã hoàn tất" : "Chưa hoàn tất"}
                  </span>
                </td>
                <td>{formatRelativeTimeVi(user.lastLoginAt)}</td>
                <td>{formatDateVi(user.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <Link
                      className={`${styles.linkBtn} ${styles.linkBtnBlue}`}
                      href={`/profile/${user.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Hồ sơ
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function statusLabel(status: UserAdminSummary["status"]) {
  switch (status) {
    case "active":
      return "Hoạt động";
    case "pending_verification":
      return "Chờ xác minh";
    case "deactivated":
      return "Vô hiệu hóa";
    default:
      return status;
  }
}

function tierLabel(tier: UserAdminSummary["tier"]) {
  switch (tier) {
    case "free":
      return "Miễn phí";
    case "paid":
      return "Trả phí";
    default:
      return tier;
  }
}

function statusToneClass(status: UserAdminSummary["status"], s: typeof styles) {
  switch (status) {
    case "active":
      return s.pillBlue;
    case "pending_verification":
      return s.pillGray;
    case "deactivated":
      return s.pillRed;
    default:
      return s.pillGray;
  }
}
