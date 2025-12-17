import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSession } from "@/application/infra/auth/session";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const isStaff = session.role === "staff";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Xin chào, {session.email}</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isStaff ? "Bảng điều khiển nhân sự" : "Bảng điều khiển học viên"}
          </h1>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Trạng thái tài khoản
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Vai trò: {isStaff ? "Nhân sự (giáo viên/quản trị)" : "Học viên"}
          </p>
          {!session.profileCompleted && (
            <p className="text-sm text-amber-600 mt-2">
              Hồ sơ chưa hoàn tất. Vui lòng cập nhật thông tin.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Bước tiếp theo
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {isStaff ? (
              <>
                <li>Tạo/duyệt đề thi và thử thách mới.</li>
                <li>Theo dõi tiến độ học viên và thống kê.</li>
              </>
            ) : (
              <>
                <li>Tiếp tục luyện tập với các quiz được gợi ý.</li>
                <li>Theo dõi tiến độ và hoàn tất hồ sơ cá nhân.</li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}
