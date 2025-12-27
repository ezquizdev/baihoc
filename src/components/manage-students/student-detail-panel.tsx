"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  UserAdminDetail,
  UserHistory,
} from "@/application/models/userAdmin";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { TextAreaModal } from "@/components/ui/text-area-modal";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./student-detail-panel.module.css";
import { StudentEditModal } from "./student-edit-modal";

type StudentDetailPanelProps = {
  userId: string | null;
  onMutated: () => void;
};

type Notice = { tone: "success" | "error"; message: string };

export function StudentDetailPanel({
  userId,
  onMutated,
}: StudentDetailPanelProps) {
  const [user, setUser] = useState<UserAdminDetail | null>(null);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"verify" | "reset" | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReason, setVerifyReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setEditOpen(false);
    setBusyAction(null);
    setNotice(null);
    setError(null);
    setUser(null);
    setHistory(null);
    setVerifyOpen(false);
    setVerifyReason("");
    setResetOpen(false);
    if (!userId) {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const cacheBust = String(refreshKey);
        const [userRes, historyRes] = await Promise.all([
          fetch(`/api/staff/users/${userId}?_=${cacheBust}`, {
            signal: controller.signal,
          }),
          fetch(`/api/staff/users/${userId}/history?_=${cacheBust}`, {
            signal: controller.signal,
          }),
        ]);

        if (!userRes.ok) {
          const payload = await userRes.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải thông tin học sinh");
        }
        const userPayload = await userRes.json();
        const nextUser = (userPayload?.user ?? null) as UserAdminDetail | null;
        setUser(nextUser);

        if (!historyRes.ok) {
          const payload = await historyRes.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải lịch sử");
        }
        const nextHistory = (await historyRes.json()) as UserHistory;
        setHistory(nextHistory);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin học sinh",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [refreshKey, userId]);

  const title = useMemo(() => {
    if (!userId) return "Chi tiết học sinh";
    if (!user) return "Đang tải...";
    return user.fullName || user.email;
  }, [user, userId]);

  const retry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const verifyEmailConfirmed = async (reason: string | null) => {
    if (!userId || !user) return;
    setNotice(null);
    setBusyAction("verify");
    try {
      const response = await fetch(`/api/staff/users/${userId}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xác minh email");
      }
      const payload = await response.json();
      setUser((payload?.user ?? null) as UserAdminDetail | null);
      setNotice({ tone: "success", message: "Đã xác minh email." });
      onMutated();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Không thể xác minh email",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const resetPasswordConfirmed = async () => {
    if (!userId || !user) return;
    setNotice(null);
    setBusyAction("reset");
    try {
      const response = await fetch(
        `/api/staff/users/${userId}/reset-password`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể gửi email reset mật khẩu");
      }
      setNotice({
        tone: "success",
        message: "Đã gửi yêu cầu đặt lại mật khẩu.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Không thể gửi email reset mật khẩu",
      });
    } finally {
      setBusyAction(null);
    }
  };

  if (!userId) {
    return (
      <div className={styles.empty} aria-live="polite">
        Chọn một học sinh trong bảng để xem chi tiết.
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateCard} role="alert">
        {error}
        <div>
          <button className={styles.stateAction} type="button" onClick={retry}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const headerBadges = user ? (
    <div className={styles.badges}>
      <span
        className={`${styles.pill} ${
          user.tier === "paid" ? styles.pillBlue : styles.pillGray
        }`}
      >
        {tierLabel(user.tier)}
      </span>
      <span
        className={`${styles.pill} ${statusToneClass(user.status, styles)}`}
      >
        {statusLabel(user.status)}
      </span>
      <span
        className={`${styles.pill} ${
          user.emailVerifiedAt ? styles.pillBlue : styles.pillGray
        }`}
      >
        {user.emailVerifiedAt ? "Đã xác minh email" : "Chưa xác minh email"}
      </span>
    </div>
  ) : null;

  const membershipHistory = history?.membership ?? [];
  const statusHistory = history?.status ?? [];

  return (
    <div className={styles.panel} aria-busy={loading}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.subtitle}>{user?.email ?? "—"}</div>
        </div>
        {headerBadges}
      </div>

      {notice ? (
        <div
          className={`${styles.notice} ${
            notice.tone === "success"
              ? styles.noticeSuccess
              : styles.noticeError
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}

      <div className={styles.actions}>
        {user ? (
          <Link
            className={`${styles.linkBtn} ${styles.linkBtnBlue}`}
            href={`/profile/${user.id}`}
          >
            Mở hồ sơ
          </Link>
        ) : (
          <button
            type="button"
            className={`${styles.linkBtn} ${styles.linkBtnBlue}`}
            disabled
          >
            Mở hồ sơ
          </button>
        )}
        <button
          type="button"
          className={styles.linkBtn}
          disabled={!user}
          onClick={() => setEditOpen(true)}
        >
          Cập nhật
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          disabled={
            !user || Boolean(busyAction) || Boolean(user?.emailVerifiedAt)
          }
          onClick={() => {
            setVerifyReason("");
            setVerifyOpen(true);
          }}
        >
          {busyAction === "verify" ? "Đang xác minh..." : "Xác minh email"}
        </button>
        <button
          type="button"
          className={`${styles.linkBtn} ${styles.linkBtnRed}`}
          disabled={!user || Boolean(busyAction)}
          onClick={() => setResetOpen(true)}
        >
          {busyAction === "reset" ? "Đang gửi..." : "Reset mật khẩu"}
        </button>
      </div>

      <TextAreaModal
        open={verifyOpen}
        title="Xác minh email?"
        message="Xác minh email cho học sinh này? Tài khoản sẽ được chuyển sang trạng thái Hoạt động."
        value={verifyReason}
        onChange={setVerifyReason}
        placeholder="Lý do (tuỳ chọn)"
        helpText="Có thể để trống."
        primaryLabel="Xác minh"
        secondaryLabel="Hủy"
        disablePrimary={Boolean(busyAction)}
        onClose={() => setVerifyOpen(false)}
        onSecondary={() => setVerifyOpen(false)}
        onPrimary={() => {
          const reason = verifyReason.trim() ? verifyReason.trim() : null;
          setVerifyOpen(false);
          setVerifyReason("");
          void verifyEmailConfirmed(reason);
        }}
      />

      <ConfirmModal
        open={resetOpen}
        title="Reset mật khẩu?"
        message="Gửi email đặt lại mật khẩu cho học sinh này? (Email sẽ được gửi qua Brevo nếu đã cấu hình.)"
        confirmLabel="Gửi"
        cancelLabel="Hủy"
        disableConfirm={Boolean(busyAction)}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          void resetPasswordConfirmed();
        }}
      />

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Tóm tắt</h4>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>User ID</span>
            <div className={styles.fieldValue}>{user?.id ?? "—"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Trường/Lớp</span>
            <div className={styles.fieldValue}>{user?.school ?? "—"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ngày sinh</span>
            <div className={styles.fieldValue}>
              {formatDateVi(user?.dateOfBirth)}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Hoàn tất hồ sơ</span>
            <div className={styles.fieldValue}>
              {user
                ? user.profileCompleted
                  ? "Đã hoàn tất"
                  : "Chưa hoàn tất"
                : "—"}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Lần đăng nhập gần nhất</span>
            <div className={styles.fieldValue}>
              {formatRelativeTimeVi(user?.lastLoginAt)}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ngày tạo</span>
            <div className={styles.fieldValue}>
              {formatDateVi(user?.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Lịch sử</h4>
        <div className={styles.historyGrid}>
          <section className={styles.historyBlock} aria-label="Lịch sử gói">
            <div className={styles.historyTitle}>Gói</div>
            {history ? (
              membershipHistory.length ? (
                <ul className={styles.historyList}>
                  {membershipHistory.map((entry) => (
                    <li key={entry.id} className={styles.historyItem}>
                      <div className={styles.historyRow}>
                        <span className={styles.historyWhen}>
                          {formatDateVi(entry.createdAt)}
                        </span>
                        <span className={styles.historyWhat}>
                          {tierLabel(entry.fromTier)} →{" "}
                          {tierLabel(entry.toTier)}
                        </span>
                      </div>
                      {entry.reason ? (
                        <div className={styles.historyReason}>
                          {entry.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptySmall}>Chưa có thay đổi gói.</div>
              )
            ) : (
              <div className={styles.emptySmall}>Đang tải...</div>
            )}
          </section>

          <section
            className={styles.historyBlock}
            aria-label="Lịch sử trạng thái"
          >
            <div className={styles.historyTitle}>Trạng thái</div>
            {history ? (
              statusHistory.length ? (
                <ul className={styles.historyList}>
                  {statusHistory.map((entry) => (
                    <li key={entry.id} className={styles.historyItem}>
                      <div className={styles.historyRow}>
                        <span className={styles.historyWhen}>
                          {formatDateVi(entry.createdAt)}
                        </span>
                        <span className={styles.historyWhat}>
                          {statusLabel(entry.fromStatus)} →{" "}
                          {statusLabel(entry.toStatus)}
                        </span>
                      </div>
                      {entry.reason ? (
                        <div className={styles.historyReason}>
                          {entry.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptySmall}>
                  Chưa có thay đổi trạng thái.
                </div>
              )
            ) : (
              <div className={styles.emptySmall}>Đang tải...</div>
            )}
          </section>
        </div>
      </div>

      <StudentEditModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setUser(updated);
          setEditOpen(false);
          setNotice({ tone: "success", message: "Đã cập nhật học sinh." });
          onMutated();
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}

function statusLabel(status: UserAdminDetail["status"]) {
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

function tierLabel(tier: UserAdminDetail["tier"]) {
  switch (tier) {
    case "free":
      return "Miễn phí";
    case "paid":
      return "Trả phí";
    default:
      return tier;
  }
}

function statusToneClass(status: UserAdminDetail["status"], s: typeof styles) {
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
