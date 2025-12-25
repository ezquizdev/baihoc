import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <StaffShell
      pageTitle="Tổng quan"
      activeNav="overview"
      userEmail="loading@baihoc.dev"
      userName="Đang tải"
      avatarUrl={null}
    >
      <div className={styles.wrapper} aria-busy="true">
        <div className={`${styles.skeleton} ${styles.banner}`} />
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <div className={`${styles.skeleton} ${styles.statsRow}`} />
            <div className={`${styles.skeleton} ${styles.charts}`} />
            <div className={`${styles.skeleton} ${styles.activity}`} />
          </div>
          <div className={styles.rightCol}>
            <div className={`${styles.skeleton} ${styles.leaderboard}`} />
            <div className={`${styles.skeleton} ${styles.competency}`} />
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
