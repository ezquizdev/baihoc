"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  token: string;
  tokenValid: boolean;
};

export function ResetForm({ token, tokenValid }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isInvalid = !tokenValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    if (!token) {
      setError("Thiếu mã đặt lại. Vui lòng mở liên kết từ email.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
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
      subtitle="Đặt lại mật khẩu mới của bạn."
      footer={
        <Link href="/auth/login" className="font-medium text-[var(--text)]">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Card>
        {isInvalid ? (
          <p className="text-sm text-[var(--danger-text)]">
            Mã đặt lại không hợp lệ hoặc đã hết hạn.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={
                <>
                  Mật khẩu mới{" "}
                  <span className="text-[var(--danger-text)]">*</span>
                </>
              }
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="Tối thiểu 8 ký tự."
            />
            <Input
              label={
                <>
                  Nhập lại mật khẩu{" "}
                  <span className="text-[var(--danger-text)]">*</span>
                </>
              }
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
            {status === "success" && (
              <p className="text-sm text-[var(--success-text)]">
                Đặt lại mật khẩu thành công. Chuyển hướng tới trang đăng nhập...
              </p>
            )}
            {error && (
              <p className="text-sm text-[var(--danger-text)]">{error}</p>
            )}
            <Button type="submit" block disabled={loading}>
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
