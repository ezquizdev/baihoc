"use client";

import Link from "next/link";
import { SpinnerGap } from "phosphor-react";
import { useEffect, useMemo, useState } from "react";
import type {
  UserAdminDetail,
  UserHistory,
} from "@/application/models/userAdmin";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RichText } from "@/components/ui/rich-text";
import { TextAreaModal } from "@/components/ui/text-area-modal";
import { formatDateVi, formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./student-detail-panel.module.css";
import { StudentEditModal } from "./student-edit-modal";

type StudentDetailPanelProps = {
  userId: string | null;
  onMutated: () => void;
};

type Notice = { tone: "success" | "error"; message: string };

type AiSummary = {
  status: "pending" | "processing" | "failed" | "completed";
  summaryMarkdown: string | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type AiSummaryState = {
  eligible: boolean;
  summary: AiSummary | null;
};

export function StudentDetailPanel({
  userId,
  onMutated,
}: StudentDetailPanelProps) {
  const [user, setUser] = useState<UserAdminDetail | null>(null);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryState | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<
    "verify" | "reset" | "ai_summary" | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyReason, setVerifyReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [regenSummaryOpen, setRegenSummaryOpen] = useState(false);

  useEffect(() => {
    setEditOpen(false);
    setBusyAction(null);
    setNotice(null);
    setError(null);
    setUser(null);
    setHistory(null);
    setAiSummary(null);
    setAiSummaryLoading(false);
    setAiSummaryError(null);
    setVerifyOpen(false);
    setVerifyReason("");
    setResetOpen(false);
    setRegenSummaryOpen(false);
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

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        setAiSummaryLoading(true);
        setAiSummaryError(null);

        const cacheBust = String(refreshKey);
        const response = await fetch(
          `/api/staff/users/${userId}/ai-summary?_=${cacheBust}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải AI summary");
        }
        const payload = (await response.json()) as AiSummaryState;
        setAiSummary(payload);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setAiSummaryError(
          err instanceof Error ? err.message : "Không thể tải AI summary",
        );
      } finally {
        setAiSummaryLoading(false);
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

  const regenSummaryConfirmed = async () => {
    if (!userId || !user) return;
    setNotice(null);
    setBusyAction("ai_summary");
    try {
      const response = await fetch(`/api/staff/users/${userId}/ai-summary`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể tạo lại AI summary");
      }
      const payload = (await response.json()) as AiSummaryState;
      setAiSummary(payload);
      setNotice({ tone: "success", message: "Đã yêu cầu tạo lại tóm tắt AI." });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Không thể tạo lại AI summary",
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
  const aiEligible = aiSummary?.eligible ?? false;
  const aiStatus = aiSummary?.summary?.status ?? null;
  const aiCompletedAt = aiSummary?.summary?.completedAt ?? null;
  const aiRequestedAt = aiSummary?.summary?.requestedAt ?? null;
  const aiTimeLabel = aiCompletedAt
    ? `Cập nhật: ${formatRelativeTimeVi(aiCompletedAt)}`
    : aiRequestedAt
      ? `Yêu cầu: ${formatRelativeTimeVi(aiRequestedAt)}`
      : null;
  const aiLocked = user ? user.tier !== "paid" : true;
  const canRegenAiSummary = Boolean(
    user && !aiLocked && aiEligible && !aiSummaryLoading && !busyAction,
  );

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

      <div className={styles.actionBar}>
        <div className={styles.actionPrimary}>
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
        </div>

        {user ? (
          <details className={styles.actionMenu}>
            <summary
              className={`${styles.linkBtn} ${styles.actionMenuSummary}`}
            >
              Thao tác
            </summary>
            <div className={styles.actionMenuList}>
              <button
                type="button"
                className={styles.actionMenuItem}
                disabled={Boolean(busyAction) || Boolean(user.emailVerifiedAt)}
                onClick={() => {
                  setVerifyReason("");
                  setVerifyOpen(true);
                }}
              >
                {busyAction === "verify"
                  ? "Đang xác minh..."
                  : "Xác minh email"}
              </button>
              <button
                type="button"
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                disabled={Boolean(busyAction)}
                onClick={() => setResetOpen(true)}
              >
                {busyAction === "reset" ? "Đang gửi..." : "Reset mật khẩu"}
              </button>
            </div>
          </details>
        ) : (
          <button type="button" className={styles.linkBtn} disabled>
            Thao tác
          </button>
        )}
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

      <ConfirmModal
        open={regenSummaryOpen}
        title="Tạo lại tóm tắt AI?"
        message="Tạo lại gợi ý học tập cho học sinh này? Hệ thống sẽ tạo lại trong nền và bạn có thể quay lại xem sau."
        confirmLabel="Tạo lại"
        cancelLabel="Hủy"
        disableConfirm={Boolean(busyAction)}
        onCancel={() => setRegenSummaryOpen(false)}
        onConfirm={() => {
          setRegenSummaryOpen(false);
          void regenSummaryConfirmed();
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
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>AI gợi ý học tập</h4>
          <button
            type="button"
            className={styles.linkBtn}
            disabled={!canRegenAiSummary}
            onClick={() => setRegenSummaryOpen(true)}
          >
            Tạo lại
          </button>
        </div>

        <div className={styles.aiSummaryCard}>
          <div className={styles.aiSummaryMetaRow}>
            <span
              className={`${styles.pill} ${aiStatusToneClass(aiStatus, styles)}`}
            >
              {aiStatusLabel(aiStatus)}
            </span>
            {aiTimeLabel ? (
              <span className={styles.aiSummaryMetaText}>{aiTimeLabel}</span>
            ) : null}
          </div>

          {aiLocked ? (
            <div className={styles.aiSummaryBody}>
              Chỉ áp dụng cho học sinh trả phí.
            </div>
          ) : !aiEligible ? (
            <div className={styles.aiSummaryBody}>
              Chưa đủ lịch sử làm bài để tạo gợi ý học tập.
            </div>
          ) : aiSummaryLoading ? (
            <div className={styles.aiSummaryBody}>
              <span className="inline-flex items-center gap-2">
                <SpinnerGap size={16} className="animate-spin" /> Đang tải…
              </span>
            </div>
          ) : aiSummaryError ? (
            <div className={styles.aiSummaryBody}>{aiSummaryError}</div>
          ) : aiSummary?.summary?.status === "completed" &&
            aiSummary.summary.summaryMarkdown ? (
            <div className={styles.aiSummaryRichText}>
              <RichText
                content={aiSummary.summary.summaryMarkdown}
                allowLinks={false}
              />
            </div>
          ) : aiSummary?.summary?.status === "failed" ? (
            <div className={styles.aiSummaryBody}>
              Không thể tạo gợi ý.{" "}
              {aiSummary.summary.errorMessage
                ? `(${aiSummary.summary.errorMessage})`
                : null}
            </div>
          ) : aiSummary?.summary?.status === "pending" ||
            aiSummary?.summary?.status === "processing" ? (
            <div className={styles.aiSummaryBody}>
              <span className="inline-flex items-center gap-2">
                <SpinnerGap size={16} className="animate-spin" /> Đang tạo gợi
                ý… Quay lại sau để xem.
              </span>
            </div>
          ) : (
            <div className={styles.aiSummaryBody}>
              Chưa có tóm tắt. Nhấn “Tạo lại” để bắt đầu.
            </div>
          )}
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

function aiStatusLabel(status: AiSummary["status"] | null) {
  if (!status) return "Chưa có";
  switch (status) {
    case "pending":
    case "processing":
      return "Đang tạo";
    case "failed":
      return "Lỗi";
    case "completed":
      return "Đã tạo";
    default:
      return "Chưa có";
  }
}

function aiStatusToneClass(
  status: AiSummary["status"] | null,
  s: typeof styles,
) {
  if (!status) return s.pillGray;
  switch (status) {
    case "completed":
      return s.pillBlue;
    case "failed":
      return s.pillRed;
    case "pending":
    case "processing":
      return s.pillGray;
  }
}
