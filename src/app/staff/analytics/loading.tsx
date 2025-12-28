import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import styles from "../staff-stub-page.module.css";

export default function Loading() {
  return (
    <StaffShell
      pageTitle="Phân tích thống kê"
      activeNav="analytics"
      userEmail="loading@baihoc.dev"
      userName="Đang tải"
      avatarUrl={null}
    >
      <div className={styles.card} aria-busy="true">
        Đang tải...
      </div>
    </StaffShell>
  );
}
