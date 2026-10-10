import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, Minus, ArrowUp } from "lucide-react";

export type KpiTone = "default" | "emerald" | "amber";

interface KpiCardProps {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  valueSuffix?: React.ReactNode;
  /** Optional percent change versus the previous equivalent period. */
  delta?: number | null;
  deltaNeutralKey?: string;
  sub?: React.ReactNode;
  progress?: number | null;
  tone?: KpiTone;
}

const toneStyles: Record<KpiTone, string> = {
  default: "bg-[#EFF4FF] text-[#2563EB]",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

/**
 * Overview KPI card. Every number comes from the real endpoints; the progress
 * bar and delta are computed client-side from the same data (never cached
 * hard-coded figures).
 */
export const AdminKpiCard: React.FC<KpiCardProps> = ({
  labelKey,
  icon: Icon,
  value,
  valueSuffix,
  delta,
  deltaNeutralKey,
  sub,
  progress,
  tone = "default",
}) => {
  const { t } = useTranslation();

  const deltaLabel =
    delta === null || delta === undefined
      ? deltaNeutralKey
        ? t(deltaNeutralKey)
        : null
      : `${delta > 0 ? "+" : ""}${delta}%`;

  const DeltaIcon =
    delta === null || delta === undefined || delta === 0
      ? Minus
      : delta > 0
        ? ArrowUp
        : ArrowDown;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] transition-all hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
          {t(labelKey)}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
          {value}
        </span>
        {valueSuffix && (
          <span className="text-sm font-bold text-[#565E74]">{valueSuffix}</span>
        )}
      </div>

      {progress !== null && progress !== undefined && (
        <div className="mt-3 flex items-center justify-between">
          <div className="mr-2 h-2 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
            <div
              className="h-full rounded-full bg-[#2563EB]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-[#2563EB]">
            {progress}%
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {deltaLabel ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold ${
              delta !== null && delta !== undefined
                ? delta > 0
                  ? "text-emerald-600"
                  : delta < 0
                    ? "text-red-600"
                    : "text-[#565E74]"
                : "text-[#A6ACBE]"
            }`}
          >
            {delta !== null && delta !== undefined && delta !== 0 && (
              <DeltaIcon className="h-3.5 w-3.5" />
            )}
            {deltaLabel}
          </span>
        ) : null}
        {sub && <span className="text-xs text-[#565E74]">{sub}</span>}
      </div>
    </div>
  );
};

export default AdminKpiCard;