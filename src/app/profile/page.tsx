import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { Card } from "@/components/ui/card";

type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  profileCompleted: boolean;
};

async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get("baihoc_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET),
    );
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: String(payload.role),
      profileCompleted: Boolean(payload.profileCompleted),
    };
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Hồ sơ cá nhân</h1>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-600">
            {session.email.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-900">
              {session.email}
            </p>
            <p className="text-sm text-slate-600">Quyền: {session.role}</p>
            {!session.profileCompleted && (
              <p className="text-sm text-amber-600">
                Hồ sơ chưa hoàn tất. Vui lòng cập nhật thông tin.
              </p>
            )}
          </div>
        </div>
      </Card>
    </main>
  );
}
