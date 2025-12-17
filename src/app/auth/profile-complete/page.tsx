"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfileCompletePage() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("userId") || "";
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName,
          school,
          dateOfBirth: dateOfBirth || null,
          avatarUrl: avatarUrl || null,
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
          <Input
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Trường/Lớp"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />
          <Input
            label="Ngày sinh"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <Input
            label="Ảnh đại diện (URL)"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
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
