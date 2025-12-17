"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = params.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không đặt lại được mật khẩu");
      }
      setStatus("success");
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err) {
      setStatus("error");
      const msg =
        err instanceof Error ? err.message : "Không đặt lại được mật khẩu";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle="Nhập mã đặt lại và mật khẩu mới."
      footer={
        <Link href="/auth/login" className="font-medium text-slate-900">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Mã đặt lại (token)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Tối thiểu 8 ký tự."
          />
          {status === "success" && (
            <p className="text-sm text-green-600">
              Đặt lại mật khẩu thành công. Chuyển hướng tới trang đăng nhập...
            </p>
          )}
          {status === "error" && error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" block disabled={loading}>
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
