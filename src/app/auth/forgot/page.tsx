"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không gửi được email khôi phục");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      const msg =
        err instanceof Error ? err.message : "Không gửi được email khôi phục";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={
        <Link href="/auth/login" className="font-medium text-slate-900">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {status === "sent" && (
            <p className="text-sm text-green-600">
              Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư của bạn.
            </p>
          )}
          {status === "error" && error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" block disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
