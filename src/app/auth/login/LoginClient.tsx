"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function sanitizeNext(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function dashboardHrefForRole(role: string) {
  return role === "staff" ? "/staff/dashboard" : "/dashboard";
}

export default function LoginClient() {
  const router = useRouter();
  type RouterHref = Parameters<typeof router.push>[0];
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }
      if (!data.profileCompleted) {
        const qs = next ? `?next=${encodeURIComponent(next)}` : "";
        router.push(`/auth/profile-complete${qs}` as RouterHref);
      } else {
        router.push((next ?? dashboardHrefForRole(data.role)) as RouterHref);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (payload: { accessToken: string }) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth/google/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: payload.accessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google đăng nhập thất bại");
      }
      if (!data.profileCompleted) {
        const qs = next ? `?next=${encodeURIComponent(next)}` : "";
        router.push(`/auth/profile-complete${qs}` as RouterHref);
        return;
      }
      router.push((next ?? dashboardHrefForRole(data.role)) as RouterHref);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google đăng nhập thất bại";
      setError(message);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Quay lại luyện tập và xem tiến độ của bạn."
      footer={
        <p>
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="font-medium text-slate-900">
            Đăng ký
          </Link>
        </p>
      }
    >
      <Card>
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex items-center justify-end text-sm text-slate-600">
              <Link href="/auth/forgot" className="font-medium text-slate-900">
                Quên mật khẩu?
              </Link>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" block disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase text-slate-500">Hoặc</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleButton onSuccess={handleGoogle} />
        </div>
      </Card>
    </AuthShell>
  );
}
