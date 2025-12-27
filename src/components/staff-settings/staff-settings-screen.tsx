"use client";

import type { SessionPayload } from "@/application/infra/auth/session";
import type { AllowlistEntry } from "@/application/models/userAdmin";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { AllowlistManager } from "./allowlist-manager";
import styles from "./staff-settings-screen.module.css";

export type StaffSettingsStatus = {
  appUrl: string;
  logLevel: string;
  emailSender: { name: string; email: string };
  googleOAuth: { serverConfigured: boolean; publicConfigured: boolean };
  llmConfigured: boolean;
  avatars: { bucket: string; maxSizeMb: number };
};

type StaffSettingsScreenProps = {
  session: SessionPayload;
  status: StaffSettingsStatus;
  initialAllowlist: AllowlistEntry[];
  initialAllowlistTotal: number;
};

export function StaffSettingsScreen({
  session,
  status,
  initialAllowlist,
  initialAllowlistTotal,
}: StaffSettingsScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];

  return (
    <StaffShell
      pageTitle="Cài đặt"
      activeNav="settings"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      hideSearch
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Cài đặt hệ thống</h1>
            <p className={styles.heroText}>
              Cấu hình và vận hành nền tảng: allowlist, tích hợp, và các gợi ý
              thiết lập để hệ thống chạy ổn định.
            </p>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={`cardBase ${styles.card}`} aria-label="Status">
            <h2 className={styles.cardTitle}>Trạng thái cấu hình</h2>
            <div className={styles.statusList}>
              <StatusRow label="App URL" value={status.appUrl} tone="info" />
              <StatusRow
                label="Log level"
                value={status.logLevel}
                tone="info"
              />
              <StatusRow
                label="Email sender"
                value={`${status.emailSender.name} <${status.emailSender.email}>`}
                tone="ok"
              />
              <StatusRow
                label="Supabase avatars"
                value={`Bucket: ${status.avatars.bucket} · ${status.avatars.maxSizeMb}MB`}
                tone="ok"
              />
              <StatusRow
                label="Google OAuth"
                value={googleStatusLabel(status.googleOAuth)}
                tone={
                  status.googleOAuth.serverConfigured &&
                  status.googleOAuth.publicConfigured
                    ? "ok"
                    : "warn"
                }
              />
              <StatusRow
                label="LLM API key"
                value={status.llmConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                tone={status.llmConfigured ? "ok" : "warn"}
              />
            </div>
            <div className={styles.hint}>
              Lưu ý: Các secret không hiển thị và không chỉnh sửa trong UI. Hãy
              cấu hình qua biến môi trường (`.env.local` hoặc platform hosting).
            </div>
          </section>

          <section className={`cardBase ${styles.card}`} aria-label="Checklist">
            <h2 className={styles.cardTitle}>Gợi ý nên thiết lập</h2>
            <ul className={styles.checklist}>
              <li>
                Tạo bucket Supabase Storage tên <b>avatars</b> và đặt public để
                avatar hiển thị đúng.
              </li>
              <li>
                Dùng <b>Allowlist</b> để auto-activate tài khoản và gán gói (đặc
                biệt khi thêm email staff).
              </li>
              <li>
                Bật Google OAuth nếu muốn cho học sinh đăng nhập nhanh (cần
                config cả server + public client id).
              </li>
              <li>
                Theo dõi <b>Nhật ký hệ thống</b> để audit các thao tác quản trị.
              </li>
              <li>
                Chỉ bật LLM key khi bạn muốn mở tính năng AI (hiện chưa wired
                UI).
              </li>
            </ul>
          </section>
        </div>

        <section
          className={`cardBase ${styles.allowlistCard}`}
          aria-label="Allowlist"
        >
          <AllowlistManager
            initialItems={initialAllowlist}
            initialTotal={initialAllowlistTotal}
          />
        </section>
      </div>
    </StaffShell>
  );
}

function googleStatusLabel(status: StaffSettingsStatus["googleOAuth"]) {
  if (status.serverConfigured && status.publicConfigured) {
    return "Đã cấu hình (server + public)";
  }
  if (status.serverConfigured && !status.publicConfigured) {
    return "Thiếu NEXT_PUBLIC_GOOGLE_CLIENT_ID";
  }
  if (!status.serverConfigured && status.publicConfigured) {
    return "Thiếu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET";
  }
  return "Chưa cấu hình";
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "info";
}) {
  return (
    <div className={styles.statusRow}>
      <div className={styles.statusLabel}>{label}</div>
      <div className={styles.statusRight}>
        <span
          className={`${styles.pill} ${
            tone === "ok"
              ? styles.pillOk
              : tone === "warn"
                ? styles.pillWarn
                : styles.pillInfo
          }`}
        >
          {tone === "ok" ? "OK" : tone === "warn" ? "Chú ý" : "Info"}
        </span>
        <div className={styles.statusValue}>{value}</div>
      </div>
    </div>
  );
}
