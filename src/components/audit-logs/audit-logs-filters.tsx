"use client";

import styles from "./audit-logs-filters.module.css";

export type AuditLogsTimeRange = "24h" | "7d" | "30d" | "all";

export type AuditLogsFacets = {
  actions: string[];
  targetTypes: string[];
};

type AuditLogsFiltersProps = {
  facets: AuditLogsFacets;
  timeRange: AuditLogsTimeRange;
  onTimeRangeChange: (value: AuditLogsTimeRange) => void;
  action: string;
  onActionChange: (value: string) => void;
  targetType: string;
  onTargetTypeChange: (value: string) => void;
  onReset: () => void;
};

export function AuditLogsFilters({
  facets,
  timeRange,
  onTimeRangeChange,
  action,
  onActionChange,
  targetType,
  onTargetTypeChange,
  onReset,
}: AuditLogsFiltersProps) {
  return (
    <section className={`cardBase ${styles.filters}`} aria-label="Filters">
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Thời gian</span>
          <select
            className={styles.select}
            value={timeRange}
            onChange={(event) =>
              onTimeRangeChange(event.target.value as AuditLogsTimeRange)
            }
          >
            <option value="24h">24 giờ</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="all">Tất cả</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Action</span>
          <select
            className={styles.select}
            value={action}
            onChange={(event) => onActionChange(event.target.value)}
          >
            <option value="all">Tất cả</option>
            {(facets.actions ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Target type</span>
          <select
            className={styles.select}
            value={targetType}
            onChange={(event) => onTargetTypeChange(event.target.value)}
          >
            <option value="all">Tất cả</option>
            {(facets.targetTypes ?? []).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.resetBtn} onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
