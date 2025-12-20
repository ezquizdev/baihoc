import Image from "next/image";
import type { UserAdminDetail } from "@/application/models/userAdmin";
import { formatDateVi } from "@/lib/formatters";
import styles from "./profile-card.module.css";

function roleLabel(role: string) {
  if (role === "staff") return "Giáo viên";
  return "Học sinh";
}

function statusLabel(status: string) {
  if (status === "active") return "Hoạt động";
  if (status === "pending_verification") return "Chờ xác minh";
  if (status === "deactivated") return "Vô hiệu hóa";
  return status;
}

function tierLabel(tier: string) {
  if (tier === "paid") return "Trả phí";
  if (tier === "free") return "Miễn phí";
  return tier;
}

export function OtherUserProfileCard({ user }: { user: UserAdminDetail }) {
  return (
    <div className={styles.wrapper}>
      <section className={styles.card} aria-label="Hồ sơ người dùng">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div
              className={`${styles.avatar} ${
                user.avatarUrl ? styles.avatarHasImage : ""
              }`}
              aria-hidden="true"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  fill
                  sizes="64px"
                  quality={80}
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div className={styles.headerText}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{user.fullName || user.email}</h2>
                <span className={styles.badge}>{roleLabel(user.role)}</span>
              </div>
              <p className={styles.meta}>{user.email}</p>
            </div>
          </div>
        </header>

        <div className={styles.divider} aria-hidden="true" />

        <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Trường/Lớp</span>
            <div className={styles.fieldValue}>{user.school || "—"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ngày sinh</span>
            <div className={styles.fieldValue}>
              {formatDateVi(user.dateOfBirth)}
            </div>
          </div>
        </div>

        <div className={styles.divider} aria-hidden="true" />
        <h3 className={styles.sectionTitle}>Thông tin tài khoản</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>User ID</span>
            <div className={styles.fieldValue}>{user.id}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Trạng thái</span>
            <div className={styles.fieldValue}>{statusLabel(user.status)}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Gói</span>
            <div className={styles.fieldValue}>{tierLabel(user.tier)}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Email đã xác minh</span>
            <div className={styles.fieldValue}>
              {user.emailVerifiedAt ? formatDateVi(user.emailVerifiedAt) : "—"}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Hoàn tất hồ sơ</span>
            <div className={styles.fieldValue}>
              {user.profileCompleted ? "Đã hoàn tất" : "Chưa hoàn tất"}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Lần đăng nhập gần nhất</span>
            <div className={styles.fieldValue}>
              {formatDateVi(user.lastLoginAt)}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ngày tạo</span>
            <div className={styles.fieldValue}>
              {formatDateVi(user.createdAt)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
