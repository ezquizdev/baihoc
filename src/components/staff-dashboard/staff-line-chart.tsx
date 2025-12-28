"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatNumberVi } from "@/lib/formatters";
import styles from "./staff-line-chart.module.css";

type StaffLineChartSeries = {
  id: string;
  stroke: string;
  values: Array<number | null>;
};

type StaffLineChartProps = {
  ariaLabel: string;
  labels: string[];
  series: StaffLineChartSeries[];
  yMax?: number;
  unit?: "count" | "percent";
  spanGaps?: boolean;
  emptyLabel?: string;
};

const viewBoxWidth = 1000;
const viewBoxHeight = 320;

type HoverState = {
  index: number;
  x: number;
  y: number;
  visible: boolean;
};

const seriesLabelById: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  math: "Toán học",
  sci: "Tư duy Khoa học",
};

function safeNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function niceMax(rawMax: number) {
  if (rawMax <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const normalized = rawMax / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatValue(unit: StaffLineChartProps["unit"], value: number) {
  if (unit === "percent") return `${Math.round(value)}%`;
  return formatNumberVi(Math.round(value));
}

function buildPath(
  values: Array<number | null>,
  xForIndex: (index: number) => number,
  yForValue: (value: number) => number,
  spanGaps: boolean,
) {
  let path = "";
  let hasStarted = false;

  values.forEach((value, index) => {
    const numeric = safeNumber(value);
    if (numeric === null) {
      if (!spanGaps) hasStarted = false;
      return;
    }
    const x = xForIndex(index);
    const y = yForValue(numeric);
    path += `${hasStarted ? "L" : "M"}${x} ${y} `;
    hasStarted = true;
  });

  return path.trim();
}

export function StaffLineChart({
  ariaLabel,
  labels,
  series,
  yMax: yMaxProp,
  unit = "count",
  spanGaps: spanGapsProp,
  emptyLabel = "Chưa có dữ liệu",
}: StaffLineChartProps) {
  const pointCount = labels.length;
  const hasSeries = series.length > 0 && pointCount > 1;
  const spanGaps = spanGapsProp ?? unit === "percent";

  const allValues = useMemo(
    () => series.flatMap((line) => line.values),
    [series],
  );

  const maxValueRaw = allValues.reduce<number>(
    (max, value) => Math.max(max, safeNumber(value) ?? 0),
    0,
  );

  const computedMax = unit === "percent" ? 100 : niceMax(maxValueRaw);
  const yMax = yMaxProp ?? computedMax;

  const hasAnyPoint = allValues.some((value) => safeNumber(value) !== null);
  const hasAnyPositive = allValues.some((value) => {
    const numeric = safeNumber(value);
    return numeric !== null && numeric > 0;
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState<HoverState>({
    index: 0,
    x: 0,
    y: 0,
    visible: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const tooltipRows = useMemo(() => {
    if (!hover.visible) return [];
    return series.map((line) => ({
      id: line.id,
      label: seriesLabelById[line.id] ?? line.id,
      stroke: line.stroke,
      value: safeNumber(line.values[hover.index]),
    }));
  }, [hover.index, hover.visible, series]);

  const showTooltip =
    hover.visible && tooltipRows.some((row) => row.value !== null);

  const handleLeave = () => {
    setHover((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const shouldRenderChart =
    hasSeries && hasAnyPoint && (unit !== "count" || hasAnyPositive);

  if (!shouldRenderChart) {
    return (
      <div className={styles.wrapper} role="img" aria-label={ariaLabel}>
        <div className={styles.empty}>{emptyLabel}</div>
      </div>
    );
  }

  const paddingLeft = 46;
  const paddingRight = 18;
  const paddingTop = 14;
  const paddingBottom = 44;

  const plotWidth = viewBoxWidth - paddingLeft - paddingRight;
  const plotHeight = viewBoxHeight - paddingTop - paddingBottom;
  const xStep = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;

  const xForIndex = (index: number) => paddingLeft + index * xStep;
  const yForValue = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), yMax);
    return paddingTop + (1 - clamped / yMax) * plotHeight;
  };

  const xLabelIndices = [
    0,
    Math.floor((pointCount - 1) / 2),
    pointCount - 1,
  ].filter((value, index, array) => array.indexOf(value) === index);

  const yTicks =
    unit === "percent" ? [0, 25, 50, 75, 100] : [0, yMax / 2, yMax];

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (pointCount < 2 || xStep <= 0) return;

    const element = svgRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
    if (x < paddingLeft || x > viewBoxWidth - paddingRight) {
      setHover((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const rawIndex = Math.round((x - paddingLeft) / xStep);
    const index = Math.min(Math.max(rawIndex, 0), pointCount - 1);

    const bubbleX = Math.min(
      Math.max(event.clientX, 20),
      window.innerWidth - 20,
    );
    const bubbleY = Math.max(event.clientY - 18, 20);

    setHover((prev) => {
      if (
        prev.visible &&
        prev.index === index &&
        prev.x === bubbleX &&
        prev.y === bubbleY
      )
        return prev;
      return { index, x: bubbleX, y: bubbleY, visible: true };
    });
  };

  const hoverX = xForIndex(hover.index);

  return (
    <div className={styles.wrapper} role="img" aria-label={ariaLabel}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        ref={svgRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <title>{ariaLabel}</title>
        {yTicks.map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={`grid-${tick}`}>
              <line
                className={styles.gridLine}
                x1={paddingLeft}
                x2={viewBoxWidth - paddingRight}
                y1={y}
                y2={y}
              />
              <text
                className={styles.axisText}
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
              >
                {unit === "percent" ? `${tick}%` : Math.round(tick)}
              </text>
            </g>
          );
        })}

        {series.map((line) => {
          const d = buildPath(line.values, xForIndex, yForValue, spanGaps);
          if (!d) return null;

          return (
            <g key={`line-${line.id}`}>
              <path
                className={styles.line}
                d={d}
                style={{ stroke: line.stroke }}
                vectorEffect="non-scaling-stroke"
              />
              {line.values.map((value, index) => {
                const numeric = safeNumber(value);
                if (numeric === null) return null;
                return (
                  <circle
                    key={`dot-${line.id}-${labels[index] ?? index}`}
                    className={styles.dot}
                    cx={xForIndex(index)}
                    cy={yForValue(numeric)}
                    r={4}
                    style={{ fill: line.stroke }}
                  />
                );
              })}
            </g>
          );
        })}

        {showTooltip ? (
          <g className={styles.hoverLayer}>
            <line
              className={styles.hoverLine}
              x1={hoverX}
              x2={hoverX}
              y1={paddingTop}
              y2={viewBoxHeight - paddingBottom}
              vectorEffect="non-scaling-stroke"
            />
            {tooltipRows.map((row) => {
              if (row.value === null) return null;
              return (
                <circle
                  key={`hover-dot-${row.id}`}
                  className={styles.hoverDot}
                  cx={hoverX}
                  cy={yForValue(row.value)}
                  r={6}
                  style={{ fill: row.stroke }}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
        ) : null}

        {xLabelIndices.map((index) => (
          <text
            key={`xlabel-${labels[index] ?? index}`}
            className={styles.axisText}
            x={xForIndex(index)}
            y={viewBoxHeight - 18}
            textAnchor={
              index === 0
                ? "start"
                : index === pointCount - 1
                  ? "end"
                  : "middle"
            }
          >
            {labels[index] ?? ""}
          </text>
        ))}
      </svg>

      {mounted && showTooltip
        ? createPortal(
            <div
              className={styles.bubble}
              style={{ left: hover.x, top: hover.y }}
              aria-live="polite"
            >
              <div className={styles.bubbleDay}>
                {labels[hover.index] ?? ""}
              </div>
              <div className={styles.bubbleRows}>
                {tooltipRows.map((row) => (
                  <div
                    key={`bubble-row-${row.id}`}
                    className={styles.bubbleRow}
                  >
                    <span
                      className={styles.bubbleDot}
                      style={{ background: row.stroke }}
                      aria-hidden="true"
                    />
                    <span className={styles.bubbleLabel}>{row.label}</span>
                    <span className={styles.bubbleValue}>
                      {row.value === null ? "—" : formatValue(unit, row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
