import { redirect } from "next/navigation";
import { controllerGetLeaderboard } from "@/application/controllers/leaderboardController";
import { controllerGetStudentDashboardHighlightChallengeCard } from "@/application/controllers/studentDashboardController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { getSelfProfileOverview } from "@/application/services/profileService";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HighlightChallengeCard } from "@/components/dashboard/highlight-challenge-card";
import { PromoBanner } from "@/components/dashboard/promo-banner";
import {
  type QuickAction,
  QuickActionsCard,
} from "@/components/dashboard/quick-actions-card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { QuizLeaderboard } from "@/components/quiz-catalog/quiz-leaderboard";
import { formatNumberVi, formatStudyTimeVi } from "@/lib/formatters";
import layoutStyles from "./dashboard-page.module.css";

const LEADERBOARD_ROWS = 5;

export default async function DashboardPage() {
  const session = await requireAuthenticatedPage({ next: "/dashboard" });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

  const [leaderboard, profileOverview, highlightChallenge] = await Promise.all([
    controllerGetLeaderboard({
      viewerUserId: session.sub,
      limit: LEADERBOARD_ROWS,
      includeSelf: true,
      subjectId: null,
    }).catch(() => ({ items: [], self: null })),
    getSelfProfileOverview(session.sub).catch(() => null),
    controllerGetStudentDashboardHighlightChallengeCard(session.sub).catch(
      () => ({ status: "none" }) as const,
    ),
  ]);

  const stats = profileOverview?.stats ?? {
    completedQuizCount: 0,
    activeDays30d: 0,
    studySeconds: 0,
    averageScorePercent: 0,
    weeklyBars: defaultWeeklyBars(),
  };

  const selfRank =
    leaderboard.self ??
    leaderboard.items.find((row) => row.userId === session.sub) ??
    null;

  const welcomeSubtitle =
    stats.completedQuizCount > 0
      ? `Bạn đã hoàn thành ${formatNumberVi(stats.completedQuizCount)} quiz trong 30 ngày qua.`
      : "Bắt đầu làm quiz đầu tiên để ghi điểm nhé.";

  const quickActions = [
    { label: "TẤT CẢ", href: "/quizzes" },
    highlightChallenge.status === "active"
      ? {
          label: "CHALLENGE\nHÔM NAY",
          href: highlightChallenge.actionHref,
        }
      : { label: "CHALLENGE\nHÔM NAY", disabled: true },
    { label: "TỰ LUYỆN QUIZ CÙNG AI", disabled: true },
    { label: "QUIZ NGẪU NHIÊN", disabled: true },
  ] satisfies QuickAction[];

  return (
    <DashboardShell
      pageTitle="Tổng quan"
      activeNav="overview"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
    >
      <WelcomeBanner
        title={`Chào mừng đã trở lại, ${displayName}!`}
        subtitle={welcomeSubtitle}
        ctaLabel="Bắt đầu ngay"
        ctaHref="/quizzes"
      />

      <section
        className={layoutStyles.pageGridTop}
        aria-label="Khối trắc nghiệm"
      >
        <HighlightChallengeCard initial={highlightChallenge} />

        <QuickActionsCard actions={quickActions} />
      </section>

      <section
        className={layoutStyles.pageGridBottom}
        aria-label="Khối thông tin dưới"
      >
        <StatsCard
          title="Thống kê"
          actionLabel="Xem chi tiết"
          actionHref="/dashboard/history"
          progressValue={stats.activeDays30d}
          progressLabel="Ngày học (30 ngày gần đây)"
          kpis={[
            {
              label: "Số quiz đã làm",
              value: formatNumberVi(stats.completedQuizCount),
            },
            {
              label: "Thời gian học",
              value: formatStudyTimeVi(stats.studySeconds),
            },
            { label: "Điểm TB", value: `${stats.averageScorePercent}%` },
          ]}
          weeklyBars={stats.weeklyBars.map((bar) => ({
            day: bar.label,
            correct: bar.correct,
            wrong: bar.wrong,
          }))}
        />

        <QuizLeaderboard
          title="Bảng xếp hạng"
          actionLabel="Xem tất cả"
          actionHref="/leaderboard"
          initial={leaderboard}
          maxRows={LEADERBOARD_ROWS}
          includeSelf={true}
          sticky={false}
        />

        <PromoBanner
          tag="BANNER"
          titleLines={["QUẢNG CÁO KHÓA HỌC"]}
          subtitle={"Quảng cáo khóa học ĐGNL"}
        />
      </section>
    </DashboardShell>
  );
}

function defaultWeeklyBars() {
  const today = new Date();
  const bars: Array<{ label: string; correct: number; wrong: number }> = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const dow = day.getDay(); // 0=Sunday ... 6=Saturday
    const label = dow === 0 ? "CN" : `T${dow + 1}`;
    bars.push({ label, correct: 0, wrong: 0 });
  }

  return bars;
}
