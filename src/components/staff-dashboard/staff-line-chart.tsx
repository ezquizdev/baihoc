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
  emptyLabel?: string;
};

const viewBoxWidth = 1000;
const viewBoxHeight = 320;

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

function buildPath(
  values: Array<number | null>,
  xForIndex: (index: number) => number,
  yForValue: (value: number) => number,
) {
  let path = "";
  let hasStarted = false;

  values.forEach((value, index) => {
    const numeric = safeNumber(value);
    if (numeric === null) {
      hasStarted = false;
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
  emptyLabel = "Chưa có dữ liệu",
}: StaffLineChartProps) {
  const pointCount = labels.length;
  const hasSeries = series.length > 0 && pointCount > 1;

  const allValues = series.flatMap((line) => line.values);
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

  if (!hasSeries || !hasAnyPoint || (unit === "count" && !hasAnyPositive)) {
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

  return (
    <div className={styles.wrapper} role="img" aria-label={ariaLabel}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
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
          const d = buildPath(line.values, xForIndex, yForValue);
          if (!d) return null;

          return (
            <g key={`line-${line.id}`}>
              <path
                className={styles.line}
                d={d}
                stroke={line.stroke}
                vectorEffect="non-scaling-stroke"
              />
              {pointCount <= 16
                ? line.values.map((value, index) => {
                    const numeric = safeNumber(value);
                    if (numeric === null) return null;
                    return (
                      <circle
                        key={`dot-${line.id}-${labels[index] ?? index}`}
                        className={styles.dot}
                        cx={xForIndex(index)}
                        cy={yForValue(numeric)}
                        r={4}
                        fill={line.stroke}
                      />
                    );
                  })
                : null}
            </g>
          );
        })}

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
    </div>
  );
}
