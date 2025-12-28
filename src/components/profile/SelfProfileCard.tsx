"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/fileHelpers";
import { formatDateVi } from "@/lib/formatters";
import styles from "./profile-card.module.css";

type Props = {
  email: string;
  role: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialSchool: string;
  initialDateOfBirth: string;
  hasPassword: boolean;
};

type ProfileTab = "profile" | "security";

function roleLabel(role: string) {
  if (role === "staff") return "Giáo viên";
  return "Học sinh";
}

function safeTrim(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function SelfProfileCard({
  email,
  role,
  initialFullName,
  initialAvatarUrl,
  initialSchool,
  initialDateOfBirth,
  hasPassword,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDetailsElement | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [school, setSchool] = useState(initialSchool);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);

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
    setSchool(initialSchool);
    setDateOfBirth(initialDateOfBirth);
    setAvatarUrl(initialAvatarUrl ?? "");
    setAvatarFile(null);
    setAvatarCleared(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [
    editing,
    initialAvatarUrl,
    initialDateOfBirth,
    initialFullName,
    initialSchool,
  ]);

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const root = event.target.closest("[data-avatar-menu-root]");
      if (!root) {
        if (avatarMenuRef.current) {
          avatarMenuRef.current.open = false;
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const previewUrl = useMemo(() => {
    if (!avatarFile) return avatarUrl;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile, avatarUrl]);

  useEffect(() => {
    if (!avatarFile) return;
    const objectUrl = previewUrl;
    return () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };
  }, [avatarFile, previewUrl]);

  const resetToInitial = () => {
    setFullName(initialFullName);
    setSchool(initialSchool);
    setDateOfBirth(initialDateOfBirth);
    setAvatarUrl(initialAvatarUrl ?? "");
    setAvatarFile(null);
    setAvatarCleared(false);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancel = () => {
    resetToInitial();
    setEditing(false);
  };

  const closeAvatarMenu = () => {
    if (!avatarMenuRef.current) return;
    avatarMenuRef.current.open = false;
  };

  const openFilePicker = () => {
    closeAvatarMenu();
    fileInputRef.current?.click();
  };

  const clearAvatar = () => {
    closeAvatarMenu();
    setError(null);
    setSuccess(null);
    setAvatarFile(null);
    setAvatarUrl("");
    setAvatarCleared(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAvatarPick = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh quá lớn, giới hạn 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarCleared(false);
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
      const uploadedAvatar = avatarFile
        ? await fileToDataUrl(avatarFile)
        : null;
      const avatarPayload = avatarCleared
        ? ""
        : uploadedAvatar || previewUrl || null;
      const res = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          school: school.trim(),
          dateOfBirth: dateOfBirth || null,
          avatarUrl: avatarPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật hồ sơ thất bại");
      }

      setFullName(trimmedName);
      setSuccess("Đã lưu thay đổi.");
      setEditing(false);
      setAvatarFile(null);
      setAvatarCleared(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            {activeTab === "profile" && editing ? (
              <details
                ref={avatarMenuRef}
                className={styles.avatarMenu}
                data-avatar-menu-root
              >
                <summary
                  className={styles.avatarSummary}
                  aria-label="Đổi ảnh đại diện"
                >
                  <div
                    className={`${styles.avatar} ${
                      previewUrl ? styles.avatarHasImage : ""
                    }`}
                    aria-hidden="true"
                  >
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt=""
                        fill
                        sizes="64px"
                        quality={80}
                        style={{ objectFit: "cover" }}
                      />
                    ) : null}
                  </div>
                  <span className={styles.avatarOverlay}>Đổi ảnh</span>
                </summary>
                <div className={styles.avatarMenuList} role="menu">
                  <button
                    type="button"
                    className={styles.avatarMenuItem}
                    onClick={openFilePicker}
                    role="menuitem"
                    disabled={saving}
                  >
                    Tải ảnh mới
                  </button>
                  <button
                    type="button"
                    className={`${styles.avatarMenuItem} ${styles.avatarMenuItemDanger}`}
                    onClick={clearAvatar}
                    role="menuitem"
                    disabled={saving || !previewUrl}
                  >
                    Xóa ảnh
                  </button>
                </div>
              </details>
            ) : (
              <div
                className={`${styles.avatar} ${
                  previewUrl ? styles.avatarHasImage : ""
                }`}
                aria-hidden="true"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt=""
                    fill
                    sizes="64px"
                    quality={80}
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => handleAvatarPick(event.target.files?.[0])}
              disabled={saving}
              hidden
              tabIndex={-1}
              aria-hidden="true"
            />

            <div className={styles.headerText}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{fullName || email}</h2>
                <span className={styles.badge}>{roleLabel(role)}</span>
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
            <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
            {editing ? (
              <div className={styles.form}>
                <p className={styles.helpText}>
                  Nhấn vào ảnh đại diện để tải ảnh mới hoặc xoá ảnh.
                </p>
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

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span>Trường/Lớp</span>
                    <input
                      className={styles.input}
                      value={school}
                      onChange={(event) => setSchool(event.target.value)}
                      autoComplete="organization"
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.label}>
                    <span>Ngày sinh</span>
                    <input
                      className={styles.input}
                      type="date"
                      value={dateOfBirth}
                      onChange={(event) => setDateOfBirth(event.target.value)}
                      autoComplete="bday"
                      disabled={saving}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Họ và tên</span>
                  <div className={styles.fieldValue}>{fullName || "—"}</div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Trường/Lớp</span>
                  <div className={styles.fieldValue}>{school || "—"}</div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Ngày sinh</span>
                  <div className={styles.fieldValue}>
                    {formatDateVi(dateOfBirth)}
                  </div>
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
              <label
                className={styles.visuallyHidden}
                htmlFor="profile-username"
              >
                Email
              </label>
              <input
                id="profile-username"
                name="username"
                type="email"
                autoComplete="username"
                value={email}
                readOnly
                tabIndex={-1}
                className={styles.visuallyHidden}
              />
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
              ) : (
                <p className={styles.helpText}>
                  Tài khoản này chưa có mật khẩu. Tạo mật khẩu để đăng nhập bằng
                  email.
                </p>
              )}

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
                  {changingPassword
                    ? "Đang lưu..."
                    : passwordEnabled
                      ? "Đổi mật khẩu"
                      : "Tạo mật khẩu"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
