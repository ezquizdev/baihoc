"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./stats-card.module.css";

type Kpi = { label: string; value: string };

type StatsCardProps = {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  progressValue: number;
  progressLabel: string;
  kpis: Kpi[];
  weeklyBars?: {
    day: string;
    correct: number; // absolute counts
    wrong: number; // absolute counts
  }[];
  className?: string;
};

type Bubble = {
  x: number;
  y: number;
  day: string;
  kind: "correct" | "wrong";
  value: number;
  visible: boolean;
};

export function StatsCard({
  title,
  actionLabel,
  onActionClick,
  progressValue,
  progressLabel,
  kpis,
  weeklyBars = [
    { day: "T2", correct: 15, wrong: 6 },
    { day: "T3", correct: 18, wrong: 4 },
    { day: "T4", correct: 9, wrong: 7 },
    { day: "T5", correct: 20, wrong: 5 },
    { day: "T6", correct: 12, wrong: 6 },
    { day: "T7", correct: 16, wrong: 5 },
    { day: "CN", correct: 10, wrong: 6 },
  ],
  className,
}: StatsCardProps) {
  const maxTotal = useMemo(
    () =>
      weeklyBars.reduce((max, d) => Math.max(max, d.correct + d.wrong), 0) || 1,
    [weeklyBars],
  );

  const [bubble, setBubble] = useState<Bubble>({
    x: 0,
    y: 0,
    day: "",
    kind: "correct",
    value: 0,
    visible: false,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSegmentMove = (
    event: React.MouseEvent<HTMLDivElement>,
    bar: (typeof weeklyBars)[number],
    kind: "correct" | "wrong",
  ) => {
    const rawX = event.clientX;
    const rawY = event.clientY;
    const x = Math.min(Math.max(rawX, 20), window.innerWidth - 20);
    const y = Math.max(rawY - 18, 20); // hover offset
    const value = kind === "correct" ? bar.correct : bar.wrong;
    setBubble({
      x,
      y,
      day: bar.day,
      kind,
      value,
      visible: true,
    });
  };

  const handleLeave = () => {
    setBubble((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {actionLabel ? (
          <button
            type="button"
            className={styles.action}
            onClick={onActionClick}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className={styles.top}>
        <div className={styles.ring}>{progressValue}</div>
        <div className={styles.meta}>
          <div className={styles.label}>{progressLabel}</div>
          <div className={styles.kpis}>
            {kpis.map((kpi) => (
              <span key={kpi.label} className={styles.kpi}>
                {kpi.label}: <b>{kpi.value}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className={styles.chart}
        role="img"
        aria-label="Biểu đồ tiến độ 7 ngày"
      >
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.correct}`} />
            Đúng
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.wrong}`} />
            Sai
          </span>
        </div>
        <ul className={styles.bars}>
          {weeklyBars.map((bar) => (
            <li key={bar.day} className={styles.bar} onMouseLeave={handleLeave}>
              <div
                className={`${styles.segment} ${styles.wrong}`}
                style={{
                  height: `${Math.max((bar.wrong / maxTotal) * 100, 0)}%`,
                  borderRadius: bar.correct > 0 ? "8px 8px 0 0" : "12px",
                }}
                role="img"
                aria-label={`Sai: ${bar.wrong}`}
                onMouseEnter={(e) => handleSegmentMove(e, bar, "wrong")}
                onMouseMove={(e) => handleSegmentMove(e, bar, "wrong")}
              />
              <div
                className={`${styles.segment} ${styles.correct}`}
                style={{
                  height: `${Math.max((bar.correct / maxTotal) * 100, 0)}%`,
                  borderRadius: bar.wrong > 0 ? "0 0 12px 12px" : "12px",
                }}
                role="img"
                aria-label={`Đúng: ${bar.correct}`}
                onMouseEnter={(e) => handleSegmentMove(e, bar, "correct")}
                onMouseMove={(e) => handleSegmentMove(e, bar, "correct")}
              />
            </li>
          ))}
        </ul>
        {mounted && bubble.visible
          ? createPortal(
              <div
                className={styles.bubble}
                style={{ left: bubble.x, top: bubble.y }}
                aria-live="polite"
              >
                <div className={styles.bubbleDay}>{bubble.day}</div>
                <div className={styles.bubbleRow}>
                  <span
                    className={`${styles.legendDot} ${
                      bubble.kind === "correct" ? styles.correct : styles.wrong
                    }`}
                  />{" "}
                  {bubble.kind === "correct" ? "Đúng" : "Sai"}:{" "}
                  <b>{bubble.value}</b>
                </div>
              </div>,
              document.body,
            )
          : null}
        <div className={styles.dayLabel} aria-hidden="true">
          {weeklyBars.map((bar) => (
            <span key={`label-${bar.day}`}>{bar.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
