import Image from "next/image";
import { RefObject } from "react";
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
  fileInputRef?: RefObject<HTMLInputElement>;
};

export function ProfileFields({
  values,
  onChange,
  setError,
  showTerms = true,
  fileInputRef,
}: Props) {
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
    onChange({
      avatarFile: file,
      avatarPreview: URL.createObjectURL(file),
    });
  };

  const resetAvatar = () => {
    onChange({ avatarFile: null, avatarPreview: "" });
    if (fileInputRef?.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Input
        label={
          <>
            Họ và tên <span className="text-red-500">*</span>
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
          className="text-sm font-medium text-slate-700"
        >
          Ảnh đại diện
        </label>
        <input
          id="avatar-file"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleAvatarFile(e.target.files?.[0])}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.acceptTerms}
            onChange={(e) => onChange({ acceptTerms: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          <span>
            Tôi đồng ý với các điều khoản sử dụng và chính sách bảo mật{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>
      )}
    </div>
  );
}
