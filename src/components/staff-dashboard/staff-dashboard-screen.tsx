"use client";

import { useRouter } from "next/navigation";
import type { StaffDashboardOverviewDto } from "@/application/models/staffDashboard";
import { LeaderboardCard } from "@/components/dashboard/leaderboard-card";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./staff-dashboard-screen.module.css";

type StaffDashboardScreenProps = {
  displayName: string;
  overview: StaffDashboardOverviewDto;
};

function formatOrDash(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatNumberVi(value);
}

function subjectVariant(slug: string) {
  if (slug === "vi") return styles.subjectVi;
  if (slug === "en") return styles.subjectEn;
  if (slug === "math") return styles.subjectMath;
  if (slug === "sci") return styles.subjectSci;
  return styles.subjectSci;
}

export function StaffDashboardScreen({
  displayName,
  overview,
}: StaffDashboardScreenProps) {
  const router = useRouter();

  const stats = overview.stats.status === "ok" ? overview.stats.data : null;
  const statsError =
    overview.stats.status === "error" ? overview.stats.message : null;

  const leaderboard =
    overview.leaderboard.status === "ok"
      ? overview.leaderboard.data.entries
      : null;
  const leaderboardError =
    overview.leaderboard.status === "error"
      ? overview.leaderboard.message
      : null;

  const activity =
    overview.activity.status === "ok" ? overview.activity.data.items : null;
  const activityError =
    overview.activity.status === "error" ? overview.activity.message : null;

  const competency =
    overview.competency.status === "ok" ? overview.competency.data : null;
  const competencyError =
    overview.competency.status === "error" ? overview.competency.message : null;

  return (
    <div className={styles.wrapper}>
      <section className={styles.welcome} aria-label="Chào mừng">
        <h2 className={styles.welcomeTitle}>
          Chào mừng đã trở lại, {displayName}!
        </h2>
        <nav className={styles.welcomeActions} aria-label="Hành động nhanh">
          <a
            className={`${styles.actionPill} ${styles.actionPillPrimary}`}
            href="/staff/quizzes"
          >
            Tạo Quiz
          </a>
          <a
            className={`${styles.actionPill} ${styles.actionPillAccent}`}
            href="/staff/quizzes"
          >
            Tạo Challenge
          </a>
          <a
            className={`${styles.actionPill} ${styles.actionPillDark}`}
            href="/staff/questions"
          >
            Kho câu hỏi
          </a>
        </nav>
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <section aria-label="Thống kê">
            <header className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Thống kê</h3>
              <a className={styles.sectionAction} href="/staff/analytics">
                Xem chi tiết
              </a>
            </header>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statTop}>
                  <p className={styles.statLabel}>Học sinh</p>
                </div>
                <div className={styles.statValue}>
                  {formatOrDash(stats?.studentCount)}
                </div>
                {statsError ? (
                  <div className={styles.mutedHint}>Không tải được</div>
                ) : null}
              </div>

              <div className={styles.statCard}>
                <div className={styles.statTop}>
                  <p className={styles.statLabel}>Câu hỏi</p>
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
                  <p className={styles.statLabel}>Lượt làm hôm nay</p>
                </div>
                <div className={styles.statValue}>
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
                    <span className={styles.topicBadge}>
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
            </div>
          </section>

          <section
            className={styles.chartsCard}
            aria-label="Biểu đồ (placeholder)"
          >
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
                <div className={styles.chartPlaceholder} aria-hidden="true" />
              </div>
              <div className={styles.chartPanel}>
                <div className={styles.chartTitle}>Tỉ lệ đúng</div>
                <div className={styles.chartPlaceholder} aria-hidden="true" />
              </div>
            </div>
          </section>

          <section className={styles.card} aria-label="Hoạt động gần đây">
            <div className={styles.cardTitleRow}>
              <h4 className={styles.cardTitle}>Hoạt động gần đây</h4>
            </div>

            {activityError ? (
              <div className={styles.emptyState}>
                Không tải được hoạt động gần đây
              </div>
            ) : activity && activity.length === 0 ? (
              <div className={styles.emptyState}>Chưa có lượt làm gần đây</div>
            ) : activity ? (
              <ul className={styles.activityList}>
                {activity.map((item) => (
                  <li key={item.id} className={styles.activityItem}>
                    <div className={styles.activityTime}>
                      {item.occurredAtRelative}
                    </div>
                    <div className={styles.activitySummary}>{item.summary}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>—</div>
            )}
          </section>
        </div>

        <div className={styles.rightCol}>
          <section aria-label="Bảng xếp hạng">
            {leaderboardError ? (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
                </div>
                <div className={styles.emptyState}>
                  Không tải được bảng xếp hạng
                </div>
              </div>
            ) : leaderboard && leaderboard.length === 0 ? (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
                </div>
                <div className={styles.emptyState}>
                  Chưa có dữ liệu bảng xếp hạng
                </div>
              </div>
            ) : leaderboard ? (
              <LeaderboardCard
                title="Bảng xếp hạng"
                actionLabel="Xem tất cả"
                onActionClick={() => router.push("/staff/leaderboard")}
                rows={leaderboard.map((entry) => ({
                  rank: entry.rank,
                  name: entry.fullName,
                  xp: entry.score,
                  avatarUrl: entry.avatarUrl,
                }))}
                scoreHeader="Điểm Năng lực"
              />
            ) : (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h4 className={styles.cardTitle}>Bảng xếp hạng</h4>
                </div>
                <div className={styles.emptyState}>—</div>
              </div>
            )}
          </section>

          <section aria-label="Điểm năng lực">
            {competencyError ? (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h4 className={styles.cardTitle}>Điểm Năng lực Trung bình</h4>
                </div>
                <div className={styles.emptyState}>
                  Không tải được điểm năng lực
                </div>
              </div>
            ) : competency ? (
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
                        <span className={styles.bucketLabel}>
                          {bucket.label}
                        </span>
                        <span className={styles.bucketValue}>
                          {formatNumberVi(bucket.count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <section
                  className={styles.subjectGrid}
                  aria-label="Năng lực theo môn"
                >
                  {competency.subjects.slice(0, 4).map((subject) => (
                    <div
                      key={subject.subjectId}
                      className={`${styles.subjectCard} ${subjectVariant(subject.subjectSlug)}`}
                    >
                      <div className={styles.subjectUpper}>
                        <div className={styles.subjectLabel}>Năng lực</div>
                        <div className={styles.subjectName}>
                          {subject.subjectName}
                        </div>
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
                            <li
                              key={bucket.label}
                              className={styles.subjectBucketRow}
                            >
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
            ) : (
              <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                  <h4 className={styles.cardTitle}>Điểm Năng lực Trung bình</h4>
                </div>
                <div className={styles.emptyState}>—</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
