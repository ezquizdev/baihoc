"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./profile-card.module.css";

type Props = {
  email: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  hasPassword: boolean;
};

type ProfileTab = "profile" | "security";

function safeTrim(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function StaffProfileCard({
  email,
  initialFullName,
  initialAvatarUrl,
  hasPassword,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [passwordEnabled, setPasswordEnabled] = useState(hasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    setFullName(initialFullName);
    setAvatarUrl(initialAvatarUrl ?? "");
  }, [editing, initialAvatarUrl, initialFullName]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!securitySuccess) return;
    const timeout = window.setTimeout(() => setSecuritySuccess(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [securitySuccess]);

  const resetToInitial = () => {
    setFullName(initialFullName);
    setAvatarUrl(initialAvatarUrl ?? "");
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    resetToInitial();
    setEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const trimmedName = safeTrim(fullName);
    if (!trimmedName) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật hồ sơ thất bại");
      }

      setFullName(trimmedName);
      setSuccess("Đã lưu thay đổi.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (nextTab: ProfileTab) => {
    if (nextTab === activeTab) return;
    if (editing) {
      handleCancel();
    }
    setSecurityError(null);
    setSecuritySuccess(null);
    setActiveTab(nextTab);
  };

  const handlePasswordSave = async () => {
    setSecurityError(null);
    setSecuritySuccess(null);
    const trimmedNew = newPassword.trim();
    if (passwordEnabled && !currentPassword.trim()) {
      setSecurityError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!trimmedNew) {
      setSecurityError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (trimmedNew !== newPasswordConfirm.trim()) {
      setSecurityError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordEnabled ? currentPassword : undefined,
          newPassword: trimmedNew,
          newPasswordConfirm: newPasswordConfirm.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Đổi mật khẩu thất bại");
      }
      setPasswordEnabled(true);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setSecuritySuccess("Đã cập nhật mật khẩu.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đổi mật khẩu thất bại";
      setSecurityError(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.card} aria-label="Hồ sơ">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div
              className={`${styles.avatar} ${
                avatarUrl ? styles.avatarHasImage : ""
              }`}
              aria-hidden="true"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
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
                <h2 className={styles.name}>{fullName || email}</h2>
                <span className={styles.badge}>Giáo viên</span>
              </div>
              <p className={styles.meta}>{email}</p>
            </div>
          </div>

          <div className={styles.actions}>
            {activeTab === "profile" ? (
              editing ? (
                <>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    setActiveTab("profile");
                    setEditing(true);
                  }}
                >
                  Chỉnh sửa
                </button>
              )
            ) : null}
          </div>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Cài đặt hồ sơ">
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${
              activeTab === "profile" ? styles.tabActive : ""
            }`}
            aria-selected={activeTab === "profile"}
            onClick={() => handleTabChange("profile")}
          >
            Hồ sơ
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${
              activeTab === "security" ? styles.tabActive : ""
            }`}
            aria-selected={activeTab === "security"}
            onClick={() => handleTabChange("security")}
          >
            Bảo mật
          </button>
        </div>

        <div aria-live="polite">
          {activeTab === "profile" ? (
            error ? (
              <div className={`${styles.formNotice} ${styles.formError}`}>
                {error}
              </div>
            ) : success ? (
              <div className={`${styles.formNotice} ${styles.formSuccess}`}>
                {success}
              </div>
            ) : null
          ) : securityError ? (
            <div className={`${styles.formNotice} ${styles.formError}`}>
              {securityError}
            </div>
          ) : securitySuccess ? (
            <div className={`${styles.formNotice} ${styles.formSuccess}`}>
              {securitySuccess}
            </div>
          ) : null}
        </div>

        <div className={styles.divider} aria-hidden="true" />

        {activeTab === "profile" ? (
          <>
            <h3 className={styles.sectionTitle}>Thông tin</h3>
            {editing ? (
              <div className={styles.form}>
                <label className={styles.label}>
                  <span>
                    Họ và tên <span className={styles.requiredMark}>*</span>
                  </span>
                  <input
                    className={styles.input}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    disabled={saving}
                  />
                </label>
              </div>
            ) : (
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Họ và tên</span>
                  <div className={styles.fieldValue}>{fullName || "—"}</div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <div className={styles.fieldValue}>{email}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className={styles.sectionTitle}>Bảo mật</h3>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                handlePasswordSave();
              }}
            >
              {passwordEnabled ? (
                <label className={styles.label}>
                  <span>Mật khẩu hiện tại</span>
                  <input
                    className={styles.input}
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={changingPassword}
                  />
                </label>
              ) : null}

              <div className={styles.formRow}>
                <label className={styles.label}>
                  <span>Mật khẩu mới</span>
                  <input
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={changingPassword}
                  />
                </label>

                <label className={styles.label}>
                  <span>Nhập lại mật khẩu mới</span>
                  <input
                    className={styles.input}
                    type="password"
                    autoComplete="new-password"
                    value={newPasswordConfirm}
                    onChange={(event) =>
                      setNewPasswordConfirm(event.target.value)
                    }
                    disabled={changingPassword}
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={changingPassword}
                >
                  {changingPassword ? "Đang lưu..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
