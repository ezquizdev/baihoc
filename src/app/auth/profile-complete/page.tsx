"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileFields, type ProfileValues } from "@/components/auth/ProfileFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fileToDataUrl } from "@/lib/fileHelpers";

export default function ProfileCompletePage() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("userId") || "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileValues>({
    fullName: "",
    school: "",
    dateOfBirth: "",
    avatarFile: null,
    avatarPreview: "",
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let avatarUrl: string | null = null;
      if (profile.avatarFile) {
        avatarUrl = await fileToDataUrl(profile.avatarFile);
      }
      const res = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName: profile.fullName,
          school: profile.school,
          dateOfBirth: profile.dateOfBirth || null,
          avatarUrl: avatarUrl || profile.avatarPreview || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật hồ sơ thất bại");
      }
      setDone(true);
      setTimeout(() => router.push("/"), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Hoàn tất thông tin"
      subtitle="Chúng tôi cần thêm vài chi tiết để cá nhân hóa trải nghiệm của bạn."
      footer={
        <Link href="/auth/login" className="font-medium text-slate-900">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ProfileFields
            values={profile}
            onChange={(updates) =>
              setProfile((prev) => ({ ...prev, ...updates }))
            }
            setError={setError}
            showTerms={false}
            fileInputRef={fileInputRef}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          {done && (
            <p className="text-sm text-green-600">Đã lưu, chuyển hướng...</p>
          )}
          <Button type="submit" block disabled={loading || !userId}>
            {loading ? "Đang lưu..." : "Hoàn tất hồ sơ"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
