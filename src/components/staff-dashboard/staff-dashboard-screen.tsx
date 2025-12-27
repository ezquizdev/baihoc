import Link from "next/link";
import { type CSSProperties, Suspense } from "react";
import {
  controllerGetStaffDashboardActivity,
  controllerGetStaffDashboardCharts,
  controllerGetStaffDashboardCompetency,
  controllerGetStaffDashboardLeaderboard,
  controllerGetStaffDashboardStats,
} from "@/application/controllers/staffDashboardController";
import { controllerListSubjects } from "@/application/controllers/subjectController";
import { LeaderboardCard } from "@/components/dashboard/leaderboard-card";
import leaderboardStyles from "@/components/dashboard/leaderboard-card.module.css";
import { StaffLineChart } from "@/components/staff-dashboard/staff-line-chart";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./staff-dashboard-screen.module.css";

type StaffDashboardScreenProps = {
  displayName: string;
  leaderboardLimit?: number;
  activityLimit?: number;
};

function formatOrDash(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatNumberVi(value);
}

function TrophyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 4h8v3h3v2c0 2.2-1.8 4-4 4h-.7A5.5 5.5 0 0 1 13 15.2V19h3v2H8v-2h3v-3.8A5.5 5.5 0 0 1 9.7 13H9c-2.2 0-4-1.8-4-4V7h3V4zm-1 5c0 1.1.9 2 2 2h.5V9H7zm12 0v2h-.5a2 2 0 0 1-2-2h2.5z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 3h6a3 3 0 0 1 3 3v15a2 2 0 0 0-2-2H6a3 3 0 0 0-3 3V6a3 3 0 0 1 3-3zm12 0h-3a4 4 0 0 0-4 4v14h7a2 2 0 0 1 2 2V5a2 2 0 0 0-2-2z" />
    </svg>
  );
}

function FastForwardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="4,6 12,12 4,18" />
      <polygon points="12,6 20,12 12,18" />
    </svg>
  );
}

function subjectVariant(slug: string) {
  if (slug === "vi") return styles.subjectVi;
  if (slug === "en") return styles.subjectEn;
  if (slug === "math") return styles.subjectMath;
  if (slug === "sci") return styles.subjectSci;
  return styles.subjectSci;
}

function topicBadgeVariant(slug: string) {
  if (slug === "vi") return styles.topicSubjectVi;
  if (slug === "en") return styles.topicSubjectEn;
  if (slug === "math") return styles.topicSubjectMath;
  if (slug === "sci") return styles.topicSubjectSci;
  return styles.topicSubjectMixed;
}

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`${styles.skeletonBlock} ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function StatsGridFallback() {
  return (
    <>
      <div className={styles.statCard} aria-busy="true">
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconStudents}`}
              aria-hidden="true"
            >
              <TrophyIcon />
            </div>
            <p className={styles.statLabel}>Học sinh</p>
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.statValueLarge}`}>
          <SkeletonBlock
            style={{ width: "72%", height: 34, borderRadius: 14 }}
          />
        </div>
      </div>

      <div className={styles.statCard} aria-busy="true">
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconQuestions}`}
              aria-hidden="true"
            >
              <BookIcon />
            </div>
            <p className={styles.statLabel}>Câu hỏi</p>
          </div>
        </div>
        <div className={styles.statValue}>
          <SkeletonBlock
            style={{ width: "58%", height: 30, borderRadius: 14 }}
          />
        </div>
        <div className={styles.statSplit}>
          <div className={styles.statSplitItem}>
            <div className={styles.statSplitValue}>
              <SkeletonBlock
                style={{ width: 46, height: 18, borderRadius: 10 }}
              />
            </div>
            <div className={styles.statSplitLabel}>Quiz</div>
          </div>
          <div className={styles.statSplitItem}>
            <div className={styles.statSplitValue}>
              <SkeletonBlock
                style={{ width: 34, height: 18, borderRadius: 10 }}
              />
            </div>
            <div className={styles.statSplitLabel}>Challenge</div>
          </div>
        </div>
      </div>

      <div className={styles.statCard} aria-busy="true">
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconAttempts}`}
              aria-hidden="true"
            >
              <FastForwardIcon />
            </div>
            <p className={styles.statLabel}>Lượt làm hôm nay</p>
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.statValueLarge}`}>
          <SkeletonBlock
            style={{ width: "64%", height: 34, borderRadius: 14 }}
          />
        </div>
      </div>

      <div className={styles.statCard} aria-busy="true">
        <div className={styles.statTop}>
          <p className={styles.statLabel}>Chủ đề sai nhiều</p>
          <span className={styles.topicSubjectBadge} aria-hidden="true">
            <SkeletonBlock style={{ width: 66, height: 18, borderRadius: 8 }} />
          </span>
        </div>
        <div className={styles.topicName}>
          <SkeletonBlock
            style={{ width: "78%", height: 14, borderRadius: 999 }}
          />
        </div>
        <div className={styles.mutedHint}>
          <SkeletonBlock
            style={{ width: "52%", height: 12, borderRadius: 999 }}
          />
        </div>
      </div>
    </>
  );
}

function ChartsCardFallback() {
  return (
    <section className={styles.chartsCard} aria-label="Biểu đồ (đang tải)">
      <ul className={styles.legend} aria-label="Chú giải">
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendVi}`}
            aria-hidden="true"
          />
          Tiếng Việt
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendEn}`}
            aria-hidden="true"
          />
          Tiếng Anh
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendMath}`}
            aria-hidden="true"
          />
          Toán học
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendSci}`}
            aria-hidden="true"
          />
          Tư duy Khoa học
        </li>
      </ul>

      <div className={styles.chartsGrid}>
        <div className={styles.chartPanel} aria-busy="true">
          <div className={styles.chartTitle}>Tần suất làm bài</div>
          <div className={styles.chartPlaceholder} aria-hidden="true" />
        </div>
        <div className={styles.chartPanel} aria-busy="true">
          <div className={styles.chartTitle}>Tỉ lệ đúng</div>
          <div className={styles.chartPlaceholder} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

const subjectStrokeBySlug: Record<string, string> = {
  vi: "#ff4d4d",
  en: "#ffd24d",
  math: "#ff8a4d",
  sci: "#4dd2ff",
};

async function StaffChartsCard({ windowDays }: { windowDays: number }) {
  const result = await controllerGetStaffDashboardCharts({ windowDays }).catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );

  if (result.status === "error") {
    return (
      <section className={styles.chartsCard} aria-label="Biểu đồ">
        <ul className={styles.legend} aria-label="Chú giải">
          <li className={styles.legendItem}>
            <span
              className={`${styles.legendDot} ${styles.legendVi}`}
              aria-hidden="true"
            />
            Tiếng Việt
          </li>
          <li className={styles.legendItem}>
            <span
              className={`${styles.legendDot} ${styles.legendEn}`}
              aria-hidden="true"
            />
            Tiếng Anh
          </li>
          <li className={styles.legendItem}>
            <span
              className={`${styles.legendDot} ${styles.legendMath}`}
              aria-hidden="true"
            />
            Toán học
          </li>
          <li className={styles.legendItem}>
            <span
              className={`${styles.legendDot} ${styles.legendSci}`}
              aria-hidden="true"
            />
            Tư duy Khoa học
          </li>
        </ul>

        <div className={styles.chartsGrid}>
          <div className={styles.chartPanel}>
            <div className={styles.chartTitle}>Tần suất làm bài</div>
            <div className={styles.chartFrame}>
              <div className={styles.chartError}>Không tải được biểu đồ</div>
            </div>
          </div>
          <div className={styles.chartPanel}>
            <div className={styles.chartTitle}>Tỉ lệ đúng</div>
            <div className={styles.chartFrame}>
              <div className={styles.chartError}>Không tải được biểu đồ</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const charts = result.data;
  const frequencySeries = charts.frequency.series.map((line) => ({
    id: line.subjectSlug,
    stroke: subjectStrokeBySlug[line.subjectSlug] ?? "rgba(255, 255, 255, 0.7)",
    values: line.values,
  }));

  const accuracySeries = charts.accuracy.series.map((line) => ({
    id: line.subjectSlug,
    stroke: subjectStrokeBySlug[line.subjectSlug] ?? "rgba(255, 255, 255, 0.7)",
    values: line.values,
  }));

  return (
    <section className={styles.chartsCard} aria-label="Biểu đồ">
      <ul className={styles.legend} aria-label="Chú giải">
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendVi}`}
            aria-hidden="true"
          />
          Tiếng Việt
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendEn}`}
            aria-hidden="true"
          />
          Tiếng Anh
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendMath}`}
            aria-hidden="true"
          />
          Toán học
        </li>
        <li className={styles.legendItem}>
          <span
            className={`${styles.legendDot} ${styles.legendSci}`}
            aria-hidden="true"
          />
          Tư duy Khoa học
        </li>
      </ul>

      <div className={styles.chartsGrid}>
        <div className={styles.chartPanel}>
          <div className={styles.chartTitle}>Tần suất làm bài</div>
          <div className={styles.chartFrame}>
            <StaffLineChart
              ariaLabel={`Tần suất làm bài theo môn (${charts.windowDays} ngày gần nhất)`}
              labels={charts.frequency.labels}
              series={frequencySeries}
              unit="count"
              emptyLabel="Chưa có lượt làm gần đây"
            />
          </div>
        </div>
        <div className={styles.chartPanel}>
          <div className={styles.chartTitle}>Tỉ lệ đúng</div>
          <div className={styles.chartFrame}>
            <StaffLineChart
              ariaLabel={`Tỉ lệ đúng theo môn (${charts.windowDays} ngày gần nhất)`}
              labels={charts.accuracy.labels}
              series={accuracySeries}
              unit="percent"
              yMax={100}
              emptyLabel="Chưa có dữ liệu"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardSectionFallback({ limit }: { limit: number }) {
  const skeletonRows = Array.from({ length: limit }, (_, index) => ({
    id: `leaderboard-skeleton-${index + 1}`,
  }));

  return (
    <div
      className={`${leaderboardStyles.card} ${styles.skeletonLeaderboardCard}`}
      aria-busy="true"
    >
      <div className={leaderboardStyles.header}>
        <h3 className={leaderboardStyles.title}>Bảng xếp hạng</h3>
        <Link className={leaderboardStyles.action} href="/staff/leaderboard">
          Xem tất cả
        </Link>
      </div>

      <div className={leaderboardStyles.tableWrap}>
        <table className={leaderboardStyles.table} aria-label="Bảng xếp hạng">
          <thead>
            <tr>
              <th style={{ width: "56px" }}>#</th>
              <th>Họ và tên</th>
              <th style={{ width: "120px", textAlign: "right" }}>
                Điểm Năng lực
              </th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((row) => (
              <tr key={row.id}>
                <td className={leaderboardStyles.rank}>
                  <SkeletonBlock
                    className={styles.skeletonInline}
                    style={{ width: 18, height: 12, borderRadius: 999 }}
                  />
                </td>
                <td>
                  <div className={leaderboardStyles.nameCell}>
                    <div
                      className={`${leaderboardStyles.avatar} ${styles.leaderboardSkeletonAvatar}`}
                      aria-hidden="true"
                    />
                    <SkeletonBlock
                      className={styles.skeletonInline}
                      style={{ width: "62%", height: 12, borderRadius: 999 }}
                    />
                  </div>
                </td>
                <td className={leaderboardStyles.xp}>
                  <SkeletonBlock
                    className={styles.skeletonInline}
                    style={{
                      width: "54%",
                      height: 12,
                      borderRadius: 999,
                      marginLeft: "auto",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompetencySectionFallback() {
  return (
    <div className={`${styles.card} ${styles.competencyCard}`} aria-busy="true">
      <div className={styles.competencyTop}>
        <div className={styles.competencyLeft}>
          <h4 className={styles.competencyHeading}>
            <span>Điểm Năng lực</span>
            <span>Trung bình</span>
          </h4>
          <div className={styles.competencyBig}>
            <SkeletonBlock
              style={{ width: 150, height: 56, borderRadius: 18 }}
            />
          </div>
        </div>

        <ul className={styles.bucketList} aria-label="Phân bố điểm">
          {["1000+", "900+", "800+", "<800"].map((label) => (
            <li key={label} className={styles.bucketRow}>
              <span className={styles.bucketLabel}>{label}</span>
              <SkeletonBlock
                className={styles.skeletonInline}
                style={{ width: 36, height: 12, borderRadius: 999 }}
              />
            </li>
          ))}
        </ul>
      </div>

      <section className={styles.subjectGrid} aria-label="Năng lực theo môn">
        {[
          { slug: "vi", name: "Tiếng Việt" },
          { slug: "en", name: "Tiếng Anh" },
          { slug: "math", name: "Toán học" },
          { slug: "sci", name: "Tư duy Khoa học" },
        ].map((subject) => (
          <div
            key={subject.slug}
            className={`${styles.subjectCard} ${subjectVariant(subject.slug)}`}
          >
            <div className={styles.subjectUpper}>
              <div className={styles.subjectLabel}>Năng lực</div>
              <div className={styles.subjectName}>{subject.name}</div>
              <div className={styles.subjectValue}>
                <SkeletonBlock
                  className={styles.skeletonBlockOnColor}
                  style={{ width: 70, height: 30, borderRadius: 14 }}
                />
              </div>
            </div>

            <ul
              className={styles.subjectBuckets}
              aria-label={`Phân bố ${subject.name}`}
            >
              {["250+", "225+", "200+", "<200"].map((label) => (
                <li key={label} className={styles.subjectBucketRow}>
                  <span>{label}</span>
                  <SkeletonBlock
                    className={styles.skeletonBlockOnColor}
                    style={{ width: 26, height: 10, borderRadius: 999 }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

async function StaffStatsGrid() {
  const result = await controllerGetStaffDashboardStats().catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );
  const stats = result.status === "ok" ? result.data : null;
  const statsError = result.status === "error" ? result.message : null;

  return (
    <>
      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconStudents}`}
              aria-hidden="true"
            >
              <TrophyIcon />
            </div>
            <p className={styles.statLabel}>Học sinh</p>
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.statValueLarge}`}>
          {formatOrDash(stats?.studentCount)}
        </div>
        {statsError ? (
          <div className={styles.mutedHint}>Không tải được</div>
        ) : null}
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconQuestions}`}
              aria-hidden="true"
            >
              <BookIcon />
            </div>
            <p className={styles.statLabel}>Câu hỏi</p>
          </div>
        </div>
        <div className={styles.statValue}>
          {formatOrDash(stats?.questionCount)}
        </div>
        <div className={styles.statSplit}>
          <div className={styles.statSplitItem}>
            <div className={styles.statSplitValue}>
              {formatOrDash(stats?.quizCount)}
            </div>
            <div className={styles.statSplitLabel}>Quiz</div>
          </div>
          <div className={styles.statSplitItem}>
            <div className={styles.statSplitValue}>
              {formatOrDash(stats?.challengeCount)}
            </div>
            <div className={styles.statSplitLabel}>Challenge</div>
          </div>
        </div>
        {statsError ? (
          <div className={styles.mutedHint}>Không tải được</div>
        ) : null}
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={styles.statTopLeft}>
            <div
              className={`${styles.statIcon} ${styles.statIconAttempts}`}
              aria-hidden="true"
            >
              <FastForwardIcon />
            </div>
            <p className={styles.statLabel}>Lượt làm hôm nay</p>
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.statValueLarge}`}>
          {formatOrDash(stats?.attemptsTodayCount)}
        </div>
        {statsError ? (
          <div className={styles.mutedHint}>Không tải được</div>
        ) : null}
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <p className={styles.statLabel}>Chủ đề sai nhiều</p>
          {stats?.mostWrongTopic ? (
            <span
              className={`${styles.topicSubjectBadge} ${topicBadgeVariant(
                stats.mostWrongTopic.subjectSlug,
              )}`}
            >
              {stats.mostWrongTopic.subjectName}
            </span>
          ) : null}
        </div>
        {stats?.mostWrongTopic ? (
          <>
            <div className={styles.topicName}>
              {stats.mostWrongTopic.topicName}
            </div>
            <div className={styles.mutedHint}>
              {formatNumberVi(stats.mostWrongTopic.wrongCount)} lượt sai
            </div>
          </>
        ) : statsError ? (
          <div className={styles.topicName}>Không tải được</div>
        ) : (
          <div className={styles.topicName}>Chưa có dữ liệu</div>
        )}
      </div>
    </>
  );
}

function ActivitySkeleton() {
  return (
    <div className={styles.activitySkeleton} aria-hidden="true">
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLine} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
    </div>
  );
}

async function StaffActivityList({ limit }: { limit: number }) {
  const result = await controllerGetStaffDashboardActivity({ limit }).catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );
  const activity = result.status === "ok" ? result.data.items : null;
  const activityError = result.status === "error" ? result.message : null;

  if (activityError) {
    return (
      <div className={styles.emptyState}>Không tải được hoạt động gần đây</div>
    );
  }
  if (activity && activity.length === 0) {
    return <div className={styles.emptyState}>Chưa có lượt làm gần đây</div>;
  }
  if (activity) {
    return (
      <ul className={styles.activityList}>
        {activity.map((item) => (
          <li key={item.id} className={styles.activityItem}>
            <div className={styles.activityTime}>{item.occurredAtRelative}</div>
            <div className={styles.activitySummary}>{item.summary}</div>
          </li>
        ))}
      </ul>
    );
  }
  return <div className={styles.emptyState}>—</div>;
}

async function StaffLeaderboardSection({ limit }: { limit: number }) {
  const result = await controllerGetStaffDashboardLeaderboard({ limit }).catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );

  const leaderboard = result.status === "ok" ? result.data.entries : null;
  const leaderboardError = result.status === "error" ? result.message : null;

  if (leaderboardError) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
        </div>
        <div className={styles.emptyState}>Không tải được bảng xếp hạng</div>
      </div>
    );
  }
  if (leaderboard && leaderboard.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
        </div>
        <div className={styles.emptyState}>Chưa có dữ liệu bảng xếp hạng</div>
      </div>
    );
  }
  if (leaderboard) {
    return (
      <LeaderboardCard
        title="Bảng xếp hạng"
        actionLabel="Xem tất cả"
        actionHref="/staff/leaderboard"
        rows={leaderboard.map((entry) => ({
          rank: entry.rank,
          name: entry.fullName,
          xp: entry.score,
          avatarUrl: entry.avatarUrl,
          href: `/profile/${entry.userId}`,
        }))}
        scoreHeader="Điểm Năng lực"
      />
    );
  }
  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
      </div>
      <div className={styles.emptyState}>—</div>
    </div>
  );
}

async function StaffCompetencySection() {
  const subjects = await controllerListSubjects().catch(() => []);
  const result = await controllerGetStaffDashboardCompetency({
    subjects,
  }).catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );
  const competency = result.status === "ok" ? result.data : null;
  const competencyError = result.status === "error" ? result.message : null;

  if (competencyError) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h4 className={styles.cardTitle}>Điểm Năng lực Trung bình</h4>
        </div>
        <div className={styles.emptyState}>Không tải được điểm năng lực</div>
      </div>
    );
  }
  if (!competency) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h4 className={styles.cardTitle}>Điểm Năng lực Trung bình</h4>
        </div>
        <div className={styles.emptyState}>—</div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.competencyCard}`}>
      <div className={styles.competencyTop}>
        <div className={styles.competencyLeft}>
          <h4 className={styles.competencyHeading}>
            <span>Điểm Năng lực</span>
            <span>Trung bình</span>
          </h4>
          <div className={styles.competencyBig}>
            {formatNumberVi(competency.overall.averageScore)}
          </div>
        </div>

        <ul className={styles.bucketList} aria-label="Phân bố điểm">
          {competency.overall.buckets.map((bucket) => (
            <li key={bucket.label} className={styles.bucketRow}>
              <span className={styles.bucketLabel}>{bucket.label}</span>
              <span className={styles.bucketValue}>
                {formatNumberVi(bucket.count)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <section className={styles.subjectGrid} aria-label="Năng lực theo môn">
        {competency.subjects.map((subject) => (
          <div
            key={subject.subjectId}
            className={`${styles.subjectCard} ${subjectVariant(subject.subjectSlug)}`}
          >
            <div className={styles.subjectUpper}>
              <div className={styles.subjectLabel}>Năng lực</div>
              <div className={styles.subjectName}>{subject.subjectName}</div>
              {subject.hasEnoughData ? (
                <div className={styles.subjectValue}>
                  {formatNumberVi(subject.averageScore)}
                </div>
              ) : null}
            </div>

            {subject.hasEnoughData ? (
              <ul
                className={styles.subjectBuckets}
                aria-label={`Phân bố ${subject.subjectName}`}
              >
                {subject.buckets.map((bucket) => (
                  <li key={bucket.label} className={styles.subjectBucketRow}>
                    <span>{bucket.label}</span>
                    <span>{formatNumberVi(bucket.count)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.subjectEmpty}>
                Chưa đủ dữ liệu theo môn
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

export function StaffDashboardScreen({
  displayName,
  leaderboardLimit = 5,
  activityLimit = 6,
}: StaffDashboardScreenProps) {
  return (
    <div className={styles.wrapper}>
      <section className={styles.welcome} aria-label="Chào mừng">
        <h2 className={styles.welcomeTitle}>
          Chào mừng đã trở lại, {displayName}!
        </h2>
        <nav className={styles.welcomeActions} aria-label="Hành động nhanh">
          <Link
            className={`${styles.actionPill} ${styles.actionPillPrimary}`}
            href="/staff/quizzes"
          >
            Tạo Quiz
          </Link>
          <Link
            className={`${styles.actionPill} ${styles.actionPillAccent}`}
            href="/staff/quizzes"
          >
            Tạo Challenge
          </Link>
          <Link
            className={`${styles.actionPill} ${styles.actionPillDark}`}
            href="/staff/questions"
          >
            Kho câu hỏi
          </Link>
        </nav>
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <section aria-label="Thống kê">
            <header className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Thống kê</h3>
              <Link className={styles.sectionAction} href="/staff/analytics">
                Xem chi tiết
              </Link>
            </header>

            <div className={styles.statsGrid}>
              <Suspense fallback={<StatsGridFallback />}>
                <StaffStatsGrid />
              </Suspense>
            </div>
          </section>

          <Suspense fallback={<ChartsCardFallback />}>
            <StaffChartsCard windowDays={14} />
          </Suspense>

          <section className={styles.card} aria-label="Hoạt động gần đây">
            <div className={styles.cardTitleRow}>
              <h4 className={styles.cardTitle}>Hoạt động gần đây</h4>
            </div>

            <Suspense fallback={<ActivitySkeleton />}>
              <StaffActivityList limit={activityLimit} />
            </Suspense>
          </section>
        </div>

        <div className={styles.rightCol}>
          <section aria-label="Bảng xếp hạng">
            <Suspense
              fallback={<LeaderboardSectionFallback limit={leaderboardLimit} />}
            >
              <StaffLeaderboardSection limit={leaderboardLimit} />
            </Suspense>
          </section>

          <section aria-label="Điểm năng lực">
            <Suspense fallback={<CompetencySectionFallback />}>
              <StaffCompetencySection />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
