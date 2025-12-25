"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/fileHelpers";
import { formatDateVi } from "@/lib/formatters";
import styles from "./profile-card.module.css";

type Props = {
  userId: string;
  email: string;
  role: string;
  profileCompleted: boolean;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialSchool: string;
  initialDateOfBirth: string;
};

function roleLabel(role: string) {
  if (role === "staff") return "Giáo viên";
  return "Học sinh";
}

function safeTrim(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function SelfProfileCard({
  userId,
  email,
  role,
  profileCompleted,
  initialFullName,
  initialAvatarUrl,
  initialSchool,
  initialDateOfBirth,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [school, setSchool] = useState(initialSchool);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    setFullName(initialFullName);
    setSchool(initialSchool);
    setDateOfBirth(initialDateOfBirth);
    setAvatarUrl(initialAvatarUrl ?? "");
    setAvatarFile(null);
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
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancel = () => {
    resetToInitial();
    setEditing(false);
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
      const res = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          school: school.trim(),
          dateOfBirth: dateOfBirth || null,
          avatarUrl: uploadedAvatar || previewUrl || null,
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

  return (
    <div className={styles.wrapper}>
      <section className={styles.card} aria-label="Hồ sơ">
        <header className={styles.header}>
          <div className={styles.headerMain}>
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

            <div className={styles.headerText}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{fullName || email}</h2>
                <span className={styles.badge}>{roleLabel(role)}</span>
              </div>
              <p className={styles.meta}>{email}</p>
            </div>
          </div>

          <div className={styles.actions}>
            {editing ? (
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
                onClick={() => setEditing(true)}
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        </header>

        <div aria-live="polite">
          {error ? (
            <div className={`${styles.formNotice} ${styles.formError}`}>
              {error}
            </div>
          ) : success ? (
            <div className={`${styles.formNotice} ${styles.formSuccess}`}>
              {success}
            </div>
          ) : null}
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>

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

            <label className={styles.label}>
              <span>Ảnh đại diện</span>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={(event) => handleAvatarPick(event.target.files?.[0])}
                disabled={saving}
              />
              <p className={styles.helpText}>
                PNG/JPG tối đa 5MB. Ảnh sẽ được lưu lên hệ thống.
              </p>
              <div className={styles.avatarPreviewRow}>
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
                <div className={styles.avatarPreviewHint}>
                  Xem trước ảnh đại diện
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Họ và tên</span>
              <div className={styles.fieldValue}>{fullName || "—"}</div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Trạng thái hồ sơ</span>
              <div className={styles.fieldValue}>
                {profileCompleted ? "Đã hoàn tất" : "Chưa hoàn tất"}
              </div>
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

        <div className={styles.divider} aria-hidden="true" />
        <h3 className={styles.sectionTitle}>Thông tin tài khoản</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>User ID</span>
            <div className={styles.fieldValue}>{userId}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <div className={styles.fieldValue}>{email}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
