"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Card } from "@/components/ui/card";

export default function VerifyClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) return;
      setStatus("verifying");
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không xác minh được email");
        }
        setStatus("success");
        setMessage("Xác minh thành công. Bạn có thể đăng nhập ngay bây giờ.");
        setTimeout(() => router.push("/auth/login"), 1000);
      } catch (err) {
        setStatus("error");
        const msg =
          err instanceof Error ? err.message : "Không xác minh được email";
        setMessage(msg);
      }
    };
    void verify();
  }, [token, router]);

  return (
    <AuthShell
      title="Xác minh email"
      subtitle="Chúng tôi đang xác thực tài khoản của bạn."
      footer={
        <Link href="/auth/login" className="font-medium text-slate-900">
          Quay lại đăng nhập
        </Link>
      }
    >
      <Card>
        {!token && (
          <p className="text-sm text-slate-700">
            Thiếu mã xác minh. Vui lòng mở liên kết từ email bạn nhận được.
          </p>
        )}
        {token && (
          <div className="space-y-3 text-sm text-slate-700">
            {status === "verifying" && <p>Đang xác minh mã của bạn...</p>}
            {status === "success" && (
              <p className="text-green-600">{message}</p>
            )}
            {status === "error" && <p className="text-red-500">{message}</p>}
          </div>
        )}
      </Card>
    </AuthShell>
  );
}
