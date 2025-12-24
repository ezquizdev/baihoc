"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import {
  ProfileFields,
  type ProfileValues,
} from "@/components/auth/ProfileFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fileToDataUrl } from "@/lib/fileHelpers";

type RegisterForm = {
  step: "choice" | "profile";
  profile: ProfileValues;
  email: string;
  password: string;
  passwordConfirm: string;
};

const initialForm: RegisterForm = {
  step: "choice",
  profile: {
    fullName: "",
    school: "",
    dateOfBirth: "",
    avatarFile: null,
    avatarPreview: "",
    acceptTerms: false,
  },
  email: "",
  password: "",
  passwordConfirm: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleProfileChange = (updates: Partial<ProfileValues>) => {
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, ...updates } }));
    setError(null);
  };

  const proceedToProfile = () => {
    if (!form.email || !form.password) {
      setError("Vui lòng nhập email và mật khẩu để tiếp tục.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Email không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu cần tối thiểu 8 ký tự.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setForm((prev) => ({ ...prev, step: "profile" }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.profile.acceptTerms) {
      setError("Bạn cần đồng ý với điều khoản sử dụng và chính sách bảo mật.");
      return;
    }
    setLoading(true);
    try {
      let avatarUrl: string | null = null;
      if (form.profile.avatarFile) {
        avatarUrl = await fileToDataUrl(form.profile.avatarFile);
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          fullName: form.profile.fullName,
          school: form.profile.school,
          dateOfBirth: form.profile.dateOfBirth || null,
          avatarUrl: avatarUrl || form.profile.avatarPreview || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }
      if (data.status === "active") {
        setSuccess("Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ.");
      } else {
        setSuccess("Đăng ký thành công. Vui lòng kiểm tra email để xác minh.");
      }
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) =>
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const handleGoogle = async (payload: {
    sub: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/oauth/google/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub: payload.sub,
          email: payload.email,
          fullName: payload.fullName,
          avatarUrl: payload.avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google đăng ký thất bại");
      }
      router.push(`/auth/profile-complete`);
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
          {form.step === "choice" && (
            <>
              <GoogleButton
                label="Đăng ký bằng Google"
                onSuccess={handleGoogle}
              />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase text-slate-500">Hoặc</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label
                    htmlFor="reg-email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="reg-email"
                    placeholder="you@example.com"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="reg-password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="reg-password"
                    placeholder="••••••••"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                    helperText="Tối thiểu 8 ký tự."
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="reg-password-confirm"
                    className="text-sm font-medium text-slate-700"
                  >
                    Nhập lại mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="reg-password-confirm"
                    placeholder="••••••••"
                    type="password"
                    value={form.passwordConfirm}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        passwordConfirm: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="button" block onClick={proceedToProfile}>
                  Tiếp tục
                </Button>
              </div>
            </>
          )}
          {form.step === "profile" && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <ProfileFields
                values={form.profile}
                onChange={handleProfileChange}
                setError={setError}
                showTerms
                fileInputRef={fileInputRef}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, step: "choice" }))
                  }
                  className="w-1/3"
                >
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  block
                  className="w-2/3"
                  disabled={loading}
                >
                  {loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </AuthShell>
  );
}
