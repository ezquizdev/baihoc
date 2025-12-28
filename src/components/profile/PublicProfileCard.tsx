import Image from "next/image";
import type { PublicProfileUserDto } from "@/application/models/profile";
import styles from "./profile-card.module.css";

function roleLabel(role: PublicProfileUserDto["role"]) {
  if (role === "staff") return "Giáo viên";
  return "Học sinh";
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export function PublicProfileCard({ user }: { user: PublicProfileUserDto }) {
  return (
    <div className={styles.wrapper}>
      <section className={styles.card} aria-label="Hồ sơ">
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
                <h2 className={styles.name}>{user.fullName || "—"}</h2>
                <span className={styles.badge}>{roleLabel(user.role)}</span>
              </div>
              <p className={styles.meta}>ID: {shortId(user.id)}</p>
            </div>
          </div>
        </header>

        <div className={styles.divider} aria-hidden="true" />

        <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Họ và tên</span>
            <div className={styles.fieldValue}>{user.fullName || "—"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Trường/Lớp</span>
            <div className={styles.fieldValue}>{user.school || "—"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
