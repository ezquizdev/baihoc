import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
      <Card
        title="Không tìm thấy trang"
        description="Trang bạn đang tìm có thể đã bị xoá hoặc đổi đường dẫn."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#2868e6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f54b8] focus:outline-none focus:ring-2 focus:ring-slate-900/10 sm:w-auto"
          >
            Về trang chủ
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 sm:w-auto"
          >
            Đăng nhập
          </Link>
        </div>
      </Card>
    </main>
  );
}
