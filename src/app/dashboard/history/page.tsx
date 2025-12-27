import { redirect } from "next/navigation";
import { controllerListAttemptHistory } from "@/application/controllers/attemptController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { isServiceError } from "@/application/services/errors";
import { AttemptHistoryScreen } from "@/components/attempt-history/attempt-history-screen";

const PAGE_SIZE = 10;

export default async function DashboardHistoryPage() {
  const session = await requireAuthenticatedPage({
    next: "/dashboard/history",
  });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }

  let initialError: string | null = null;
  const initialHistory = await (async () => {
    try {
      return await controllerListAttemptHistory(session.sub, {
        limit: PAGE_SIZE,
        offset: 0,
      });
    } catch (error) {
      if (isServiceError(error)) {
        initialError = error.message;
      } else {
        initialError =
          error instanceof Error ? error.message : "Không thể tải lịch sử";
      }
      return { items: [], total: 0 };
    }
  })();

  return (
    <AttemptHistoryScreen
      session={session}
      initialHistory={initialHistory}
      pageSize={PAGE_SIZE}
      initialError={initialError}
    />
  );
}
