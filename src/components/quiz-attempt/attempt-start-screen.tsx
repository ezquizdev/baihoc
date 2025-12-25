"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type AttemptStartScreenProps = {
  quizId: string;
};

export function AttemptStartScreen({ quizId }: AttemptStartScreenProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startAttempt = useCallback(async () => {
    try {
      setStarting(true);
      setError(null);
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể bắt đầu quiz");
      }
      const payload = (await response.json()) as { attemptId?: string };
      if (!payload.attemptId) {
        throw new Error("Không thể bắt đầu quiz");
      }
      router.replace(`/attempts/${payload.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu quiz");
      setStarting(false);
    }
  }, [quizId, router]);

  useEffect(() => {
    void startAttempt();
  }, [startAttempt]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card
        title="Đang chuẩn bị bài làm..."
        description="Vui lòng chờ trong giây lát."
        actions={
          error ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8]"
                onClick={() => {
                  void startAttempt();
                }}
              >
                Thử lại
              </button>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                href="/quizzes"
              >
                Về danh sách quiz
              </Link>
            </div>
          ) : null
        }
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          {starting ? (
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#2868e6]"
              aria-hidden="true"
            />
          ) : (
            <div
              className="grid h-6 w-6 place-items-center rounded-full border border-rose-200 bg-rose-100 text-xs font-black text-rose-700"
              aria-hidden="true"
            >
              !
            </div>
          )}
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">
              {starting ? "Đang tạo bài làm..." : "Không thể bắt đầu quiz"}
            </div>
            <div className="text-sm text-slate-600">
              {error
                ? error
                : "Đang chuyển sang màn làm bài, vui lòng không đóng trang."}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
