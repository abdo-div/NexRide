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
  default: "bg-[#F8FAFC] text-[#142B4A]",
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
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_-40px_rgba(15,23,42,.55)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_24px_65px_-38px_rgba(15,23,42,.5)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#142B4A] via-blue-500 to-cyan-400 opacity-0 transition-opacity group-hover:opacity-100" />
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
          <div className="mr-2 h-2 w-full overflow-hidden rounded-full bg-[#F8FAFC]">
            <div
              className="h-full rounded-full bg-[#142B4A]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-[#142B4A]">
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
