import Link from "next/link";
import {
  controllerGetStaffDashboardCharts,
  controllerGetStaffDashboardStats,
} from "@/application/controllers/staffDashboardController";
import { StaffLineChart } from "@/components/staff-dashboard/staff-line-chart";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./staff-dashboard-screen.module.css";

function formatOrDash(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatNumberVi(value);
}

const subjectStrokeBySlug: Record<string, string> = {
  vi: "var(--subject-vi)",
  en: "var(--subject-en)",
  math: "var(--subject-math)",
  sci: "var(--subject-sci)",
};

async function ChartsCard({ windowDays }: { windowDays: number }) {
  const result = await controllerGetStaffDashboardCharts({ windowDays }).catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );

  if (result.status === "error") {
    return (
      <section
        className={styles.chartsCard}
        aria-label={`Biểu đồ (${windowDays} ngày gần nhất)`}
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
    <section
      className={styles.chartsCard}
      aria-label={`Biểu đồ (${charts.windowDays} ngày gần nhất)`}
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

const windowDayPresets = [7, 14, 30, 60] as const;

export async function StaffAnalyticsScreen({
  windowDays = 30,
}: {
  windowDays?: number;
}) {
  const statsResult = await controllerGetStaffDashboardStats().catch(
    () =>
      ({
        status: "error",
        message: "unknown_error",
      }) as const,
  );

  const stats = statsResult.status === "ok" ? statsResult.data : null;
  const statsError =
    statsResult.status === "error" ? statsResult.message : null;
  const mostWrongTopic = stats?.mostWrongTopic ?? null;

  return (
    <div className={styles.wrapper}>
      <section aria-label="Tổng quan">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tổng quan</h2>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statTop}>
              <div className={styles.statTopLeft}>
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
              <p className={styles.statLabel}>Chủ đề sai nhiều (7 ngày)</p>
            </div>
            <div className={styles.topicName}>
              {mostWrongTopic
                ? `${mostWrongTopic.subjectName}: ${mostWrongTopic.topicName}`
                : "—"}
            </div>
            <div className={styles.mutedHint}>
              {mostWrongTopic
                ? `${formatNumberVi(mostWrongTopic.wrongCount)} lượt sai`
                : statsError
                  ? "Không tải được"
                  : "Chưa có dữ liệu"}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Biểu đồ">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Biểu đồ</h2>
          <div className={styles.timeframeControls}>
            <fieldset className={styles.timeframePills}>
              <legend className={styles.timeframeLegend}>
                Khung thời gian
              </legend>
              {windowDayPresets.map((days) => (
                <Link
                  key={days}
                  className={`${styles.timeframePill} ${windowDays === days ? styles.timeframePillActive : ""}`}
                  href={`/staff/analytics?windowDays=${days}`}
                >
                  {days} ngày
                </Link>
              ))}
            </fieldset>
            <form
              className={styles.timeframeForm}
              action="/staff/analytics"
              method="get"
            >
              <label className={styles.timeframeLabel}>
                <span className={styles.timeframeLabelText}>Tùy chỉnh</span>
                <input
                  key={windowDays}
                  className={styles.timeframeInput}
                  type="number"
                  name="windowDays"
                  min={1}
                  max={60}
                  step={1}
                  defaultValue={windowDays}
                />
              </label>
              <button className={styles.timeframeSubmit} type="submit">
                Xem
              </button>
            </form>
          </div>
        </div>
        <ChartsCard windowDays={windowDays} />
      </section>
    </div>
  );
}
