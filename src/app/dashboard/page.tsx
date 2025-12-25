import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { DailyChallengeCard } from "@/components/dashboard/daily-challenge-card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeaderboardCard } from "@/components/dashboard/leaderboard-card";
import { PromoBanner } from "@/components/dashboard/promo-banner";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import layoutStyles from "./dashboard-page.module.css";

type LeaderboardRow = {
  rank: number;
  name: string;
  xp: number;
};

const quickActions = [
  "TẤT CẢ",
  "TỰ LUYỆN QUIZ CÙNG AI",
  "QUIZ NGẪU NHIÊN",
  "TẤT CẢ CHALLENGE",
];

const leaderboard: LeaderboardRow[] = [
  { rank: 1, name: "Trần Bảo Quyên", xp: 1047 },
  { rank: 2, name: "Nguyễn Thị Hằng", xp: 1023 },
  { rank: 3, name: "Lê Văn Minh", xp: 1015 },
  { rank: 4, name: "Phạm Thị Lan", xp: 932 },
  { rank: 5, name: "Trần Văn An", xp: 910 },
];

export default async function DashboardPage() {
  const session = await requireAuthenticatedPage({ next: "/dashboard" });
  if (session.role === "staff") {
    redirect("/staff/dashboard");
  }
  const displayName = session.fullName ?? session.email.split("@")[0];

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
        subtitle="Tiếp tục làm bài thôi nào, bạn còn 10 bài chưa làm trong tuần vừa rồi"
        ctaLabel="Bắt đầu ngay"
      />

      <section
        className={layoutStyles.pageGridTop}
        aria-label="Khối trắc nghiệm"
      >
        <DailyChallengeCard
          tag="CHALLENGE"
          titleLines={["DAILY", "QUIZ"]}
          question="Dòng nào sau đây nêu tên những tác phẩm cùng phong cách sáng tác của trường phái văn học hiện thực?"
          answers={[
            { text: "Tắt đèn • Số đỏ • Chí Phèo" },
            { text: "Chữ người tử tù • Giông tố • Lão Hạc", isActive: true },
            { text: "Hai đứa trẻ • Tắt đèn • Số đỏ" },
            { text: "Lão Hạc • Số đỏ • Chữ người tử tù" },
          ]}
        />

        <QuickActionsCard actions={quickActions} />
      </section>

      <section
        className={layoutStyles.pageGridBottom}
        aria-label="Khối thông tin dưới"
      >
        <StatsCard
          title="Thống kê"
          actionLabel="Xem chi tiết"
          progressValue={36}
          progressLabel="Tiến độ hoàn thành bài tập"
          kpis={[
            { label: "Số quiz đã làm", value: "12" },
            { label: "Thời gian học", value: "12h39" },
            { label: "Điểm TB", value: "82%" },
          ]}
          weeklyBars={[
            { day: "T2", correct: 50, wrong: 20 },
            { day: "T3", correct: 70, wrong: 10 },
            { day: "T4", correct: 30, wrong: 25 },
            { day: "T5", correct: 80, wrong: 15 },
            { day: "T6", correct: 45, wrong: 22 },
            { day: "T7", correct: 60, wrong: 18 },
            { day: "CN", correct: 35, wrong: 20 },
          ]}
        />

        <LeaderboardCard
          title="Bảng xếp hạng"
          actionLabel="Xem tất cả"
          rows={leaderboard}
        />

        <PromoBanner
          tag="BANNER"
          titleLines={["QUẢNG", "CÁO"]}
          subtitle="Khu vực banner / quảng cáo (placeholder)"
        />
      </section>
    </DashboardShell>
  );
}
