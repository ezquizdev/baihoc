"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RegisterForm = {
  fullName: string;
  school: string;
  dateOfBirth: string;
  avatarUrl: string;
  email: string;
  password: string;
  acceptTerms: boolean;
};

const initialForm: RegisterForm = {
  fullName: "",
  school: "",
  dateOfBirth: "",
  avatarUrl: "",
  email: "",
  password: "",
  acceptTerms: false,
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (field: keyof RegisterForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.acceptTerms) {
      setError("Bạn cần đồng ý với điều khoản của chúng tôi.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          school: form.school,
          dateOfBirth: form.dateOfBirth || null,
          avatarUrl: form.avatarUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }
      setSuccess("Đăng ký thành công. Vui lòng kiểm tra email để xác minh.");
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (payload: {
    sub: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/oauth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub: payload.sub,
          email: payload.email,
          fullName: payload.fullName,
          avatarUrl: payload.avatarUrl,
          profileCompleted: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google đăng ký thất bại");
      }
      if (!data.profileCompleted) {
        router.push(`/auth/profile-complete?userId=${data.userId}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google đăng ký thất bại";
      setError(message);
    }
  };

  return (
    <AuthShell
      title="Đăng ký tài khoản"
      subtitle="Tham gia BaiHoc để luyện tập và nhận gợi ý học tập thông minh."
      footer={
        <p>
          Đã có tài khoản?{" "}
          <Link href="/auth/login" className="font-medium text-slate-900">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <Card>
        <div className="space-y-4">
          <GoogleButton onSuccess={handleGoogle} />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase text-slate-500">Hoặc</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              required
            />
            <Input
              label="Trường/Lớp"
              placeholder="THPT XYZ"
              value={form.school}
              onChange={(e) => handleChange("school", e.target.value)}
            />
            <Input
              label="Ngày sinh"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            />
            <Input
              label="Ảnh đại diện (URL)"
              placeholder="https://..."
              value={form.avatarUrl}
              onChange={(e) => handleChange("avatarUrl", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
              helperText="Tối thiểu 8 ký tự."
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => handleChange("acceptTerms", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              <span>
                Tôi đồng ý với các điều khoản sử dụng và chính sách bảo mật.
              </span>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" block disabled={loading}>
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </Button>
          </form>
        </div>
      </Card>
    </AuthShell>
  );
}
