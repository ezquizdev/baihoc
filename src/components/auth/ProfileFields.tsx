import Image from "next/image";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { AvatarPlaceholderMark } from "@/components/ui/avatar-placeholder-mark";
import { Input } from "@/components/ui/input";

export type ProfileValues = {
  fullName: string;
  school: string;
  dateOfBirth: string;
  avatarFile: File | null;
  avatarPreview: string;
  acceptTerms: boolean;
};

type Props = {
  values: ProfileValues;
  onChange: (updates: Partial<ProfileValues>) => void;
  setError: (msg: string | null) => void;
  showTerms?: boolean;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  avatarPicker?: "input" | "menu";
};

export function ProfileFields({
  values,
  onChange,
  setError,
  showTerms = true,
  fileInputRef,
  avatarPicker = "input",
}: Props) {
  const internalFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDetailsElement | null>(null);
  const resolvedFileInputRef = fileInputRef ?? internalFileInputRef;

  useEffect(() => {
    if (avatarPicker !== "menu") return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const root = event.target.closest("[data-avatar-menu-root]");
      if (!root && avatarMenuRef.current) {
        avatarMenuRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [avatarPicker]);

  const revokeObjectUrl = (url: string) => {
    if (!url) return;
    if (!url.startsWith("blob:")) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleAvatarFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ.");
      if (resolvedFileInputRef.current) resolvedFileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh quá lớn, giới hạn 5MB.");
      if (resolvedFileInputRef.current) resolvedFileInputRef.current.value = "";
      return;
    }
    setError(null);
    revokeObjectUrl(values.avatarPreview);
    onChange({
      avatarFile: file,
      avatarPreview: URL.createObjectURL(file),
    });
  };

  const resetAvatar = () => {
    if (avatarMenuRef.current) avatarMenuRef.current.open = false;
    setError(null);
    revokeObjectUrl(values.avatarPreview);
    onChange({ avatarFile: null, avatarPreview: "" });
    if (resolvedFileInputRef.current) resolvedFileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Input
        label={
          <>
            Họ và tên <span className="text-[var(--danger-text)]">*</span>
          </>
        }
        placeholder="Nguyễn Văn A"
        value={values.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
        required
      />
      <Input
        label="Trường/Lớp"
        placeholder="THPT XYZ"
        value={values.school}
        onChange={(e) => onChange({ school: e.target.value })}
      />
      <Input
        label="Ngày sinh"
        type="date"
        value={values.dateOfBirth}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
      />
      <div className="space-y-2">
        <label
          htmlFor="avatar-file"
          className="text-sm font-medium text-[var(--text)]"
        >
          Ảnh đại diện
        </label>
        {avatarPicker === "menu" ? (
          <div className="flex items-center gap-4">
            <details
              ref={avatarMenuRef}
              className="relative"
              data-avatar-menu-root
            >
              <summary
                className="group relative list-none cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-rgb)/0.18)] [&::-webkit-details-marker]:hidden"
                aria-label="Đổi ảnh đại diện"
              >
                <div
                  className={`relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--line)] bg-[var(--card)] text-[var(--text-secondary)] shadow-[0_10px_20px_rgba(26,46,93,0.06)] ${
                    values.avatarPreview ? "border-transparent" : ""
                  }`}
                  aria-hidden="true"
                >
                  {values.avatarPreview ? (
                    <Image
                      src={values.avatarPreview}
                      alt=""
                      fill
                      sizes="64px"
                      quality={80}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <AvatarPlaceholderMark className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  Đổi ảnh
                </span>
              </summary>
              <div
                className="absolute left-0 z-10 mt-2 w-44 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--line)] bg-[var(--card)] shadow-[0_16px_34px_rgba(26,46,93,0.14)]"
                role="menu"
              >
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[rgba(26,46,93,0.06)]"
                  onClick={() => {
                    if (avatarMenuRef.current)
                      avatarMenuRef.current.open = false;
                    resolvedFileInputRef.current?.click();
                  }}
                  role="menuitem"
                >
                  Tải ảnh mới
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--danger-text)] hover:bg-[rgba(239,68,68,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={resetAvatar}
                  role="menuitem"
                  disabled={!values.avatarPreview}
                >
                  Xóa ảnh
                </button>
              </div>
            </details>

            <div className="text-sm text-[var(--text-secondary)]">
              Nhấn vào ảnh để tải lên hoặc xóa.
            </div>

            <input
              id="avatar-file"
              ref={resolvedFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
              hidden
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        ) : (
          <>
            <input
              id="avatar-file"
              ref={resolvedFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--line)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--text)] shadow-[0_10px_20px_rgba(26,46,93,0.06)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(40,104,230,0.16)]"
            />
            {values.avatarPreview && (
              <Image
                src={values.avatarPreview}
                alt="Preview"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            )}
          </>
        )}
      </div>
      {showTerms && (
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={values.acceptTerms}
            onChange={(e) => onChange({ acceptTerms: e.target.checked })}
            className="h-4 w-4 rounded border-[color:var(--line)] accent-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-rgb)/0.18)]"
          />
          <span>
            Tôi đồng ý với các điều khoản sử dụng và chính sách bảo mật{" "}
            <span className="text-[var(--danger-text)]">*</span>
          </span>
        </label>
      )}
    </div>
  );
}
