import React, { useId } from "react";
import type { ChartPoint } from "../../lib/adminMetrics";

export type ChartMetric = "bookings" | "revenue";

interface AdminChartProps {
  points: ChartPoint[];
  /** Nice ceiling for the active metric (see niceCeiling). */
  maxValue: number;
  metric: ChartMetric;
  lang: string;
  emptyLabel: string;
}

const W = 700;
const H = 240;
const LEFT = 40;
const RIGHT = 670;
const TOP = 20;
const BOTTOM = 200;
const X_LABEL_Y = 224;
const Y_LABEL_X = 32;

const compact = (value: number, lang: string): string =>
  new Intl.NumberFormat(lang, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/**
 * Lightweight SVG area chart built from the real dispatch series. It reuses the
 * design's 700×240 viewBox so the grid, curve and labels match the reference;
 * the polyline is generated from the data, never hard-coded.
 */
export const AdminChart: React.FC<AdminChartProps> = ({
  points,
  maxValue,
  metric,
  lang,
  emptyLabel,
}) => {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const stroke = metric === "bookings" ? "#2563EB" : "#8E3C00";

  if (maxValue <= 0 || points.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  const n = points.length;
  const x = (i: number): number =>
    n <= 1 ? LEFT : LEFT + (i / (n - 1)) * (RIGHT - LEFT);
  const y = (value: number): number =>
    BOTTOM - (value / maxValue) * (BOTTOM - TOP);

  let maxIndex = 0;
  points.forEach((p, i) => {
    const v = metric === "bookings" ? p.count : p.revenue;
    if (v > (metric === "bookings" ? points[maxIndex].count : points[maxIndex].revenue)) {
      maxIndex = i;
    }
  });

  const linePoints = points.map((p, i) => ({
    x: x(i),
    y: y(metric === "bookings" ? p.count : p.revenue),
  }));

  const linePath = linePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${linePoints[n - 1].x.toFixed(1)} ${BOTTOM} L ${linePoints[0].x.toFixed(1)} ${BOTTOM} Z`;

  const gridValue = (k: number): number => maxValue * (1 - k / 3);

  return (
    <svg
      className="mt-2 h-64 w-full overflow-visible"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
    >
      <defs>
        <linearGradient id={`grad-${gradientId}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid + y axis labels */}
      {[0, 1, 2, 3].map((k) => {
        const gy = TOP + k * ((BOTTOM - TOP) / 3);
        return (
          <g key={k}>
            <line x1={LEFT} x2={RIGHT} y1={gy} y2={gy} stroke="#EFF4FF" strokeWidth="1" />
            <text
              x={Y_LABEL_X}
              y={gy + 4}
              textAnchor="end"
              fontSize="10"
              fontWeight="bold"
              fill="#565E74"
            >
              {compact(gridValue(k), lang)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={`url(#grad-${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points + peak pulse */}
      {linePoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === maxIndex ? 4 : 2.5}
          fill={stroke}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      ))}
      <circle
        cx={linePoints[maxIndex].x}
        cy={linePoints[maxIndex].y}
        r="5"
        fill={stroke}
        opacity="0.35"
      />

      {/* X axis labels */}
      {points.map((p, i) => {
        if (!p.showLabel) return null;
        const isPeak = i === maxIndex;
        return (
          <text
            key={i}
            x={x(i)}
            y={X_LABEL_Y}
            textAnchor="middle"
            fontSize="10"
            fontWeight={isPeak ? "bold" : "normal"}
            fill={isPeak ? "#2563EB" : "#565E74"}
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
};

export default AdminChart;