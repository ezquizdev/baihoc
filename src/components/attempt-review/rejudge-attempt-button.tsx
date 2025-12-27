"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RejudgeAttemptButton({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    const ok = window.confirm(
      "Chấm lại sẽ tính điểm theo phiên bản mới nhất của quiz. Điểm và XP có thể thay đổi. Bạn có muốn tiếp tục?",
    );
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/attempts/${attemptId}/rejudge`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Không thể chấm lại bài làm");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể chấm lại bài làm",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "Đang chấm lại..." : "Chấm lại"}
      </button>
      {error ? (
        <div className="text-xs font-semibold text-rose-600">{error}</div>
      ) : null}
    </div>
  );
}
