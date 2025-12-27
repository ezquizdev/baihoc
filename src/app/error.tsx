"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
      <Card
        title="Có lỗi xảy ra"
        description="Vui lòng thử lại. Nếu lỗi tiếp tục, hãy quay về trang chủ."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" onClick={reset}>
              Thử lại
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              Về trang chủ
            </Link>
          </div>
        }
      >
        {error.digest ? (
          <p className="text-sm text-slate-500">Mã lỗi: {error.digest}</p>
        ) : null}
      </Card>
    </main>
  );
}
