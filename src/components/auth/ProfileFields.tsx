import Image from "next/image";
import type { RefObject } from "react";
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
};

export function ProfileFields({
  values,
  onChange,
  setError,
  showTerms = true,
  fileInputRef,
}: Props) {
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
      resetAvatar();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh quá lớn, giới hạn 5MB.");
      resetAvatar();
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
    revokeObjectUrl(values.avatarPreview);
    onChange({ avatarFile: null, avatarPreview: "" });
    if (fileInputRef?.current) fileInputRef.current.value = "";
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
        <input
          id="avatar-file"
          ref={fileInputRef}
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
