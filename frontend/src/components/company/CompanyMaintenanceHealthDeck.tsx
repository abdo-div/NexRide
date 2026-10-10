import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Hourglass,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import {
  eventCodeOf,
  vehicleShortTitle,
} from "../../lib/maintenanceView";
import { MaintenanceStatusChip } from "../admin/MaintenanceStatusChip";
import type { MaintenanceEventDto, MaintenanceSummary } from "../../types/admin";

interface CompanyMaintenanceHealthDeckProps {
  summary: MaintenanceSummary | null;
  events: MaintenanceEventDto[];
  onSelect: (event: MaintenanceEventDto) => void;
}

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

/**
 * Fleet Operational Health (bento). The left panel is a real stacked posture
 * bar derived from the summary counts; the right panel shows the real MTD
 * expense figures while the parts-vs-labor trend chart stays a coming-soon
 * placeholder (no time-series model exists yet).
 */
export const CompanyMaintenanceHealthDeck: React.FC<CompanyMaintenanceHealthDeckProps> = ({
  summary,
  events,
  onSelect,
}) => {
  const { t } = useTranslation();

  const total = Math.max(summary?.totalFleet ?? 0, 1);
  const inService = summary?.inServiceVehicles ?? 0;
  const unavailable = summary?.unavailableFleet ?? 0;
  const available = Math.max((summary?.totalFleet ?? 0) - inService - unavailable, 0);

  const pct = (value: number) => Math.round((value / total) * 1000) / 10;

  const segments = [
    { key: "available", count: available, label: t("company.maintenance.deck.available"), tone: "bg-[#2563EB]" },
    { key: "inService", count: inService, label: t("company.maintenance.deck.inService"), tone: "bg-[#EA8A00]" },
    { key: "unavailable", count: unavailable, label: t("company.maintenance.deck.unavailable"), tone: "bg-[#CBD5E1]" },
  ];

  const actionEvent = useMemo(
    () =>
      events.find(
        (e) => e.dispatchStatus === "OVERDUE" || e.dispatchStatus === "IN_PROGRESS",
      ),
    [events],
  );

  const timeframe = ["7D", "30D", "3M", "12M"];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Left: Fleet Operational Health */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
            {t("company.maintenance.deck.title")}
          </h2>
          <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
            {t("company.maintenance.deck.totalUnits", {
              count: formatCount(summary?.totalFleet ?? 0),
            })}
          </span>
        </div>

        {/* Stacked posture bar (real counts, sums to the fleet total) */}
        <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
          {segments.map((segment) =>
            segment.count > 0 ? (
              <div
                key={segment.key}
                className={`${segment.tone} h-full transition-all`}
                style={{ width: `${(segment.count / total) * 100}%` }}
                title={`${segment.label}: ${segment.count} (${pct(segment.count)}%)`}
              />
            ) : null,
          )}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3.5 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-semibold text-[#434655]">
                <span className={`h-2.5 w-2.5 rounded-full ${segment.tone}`} />
                {segment.label}
              </dt>
              <dd className="text-sm font-extrabold text-[#0B1C30]">
                {formatCount(segment.count)}
                <span className="ml-1 text-[11px] font-semibold text-[#9AA4B5]">
                  {pct(segment.count)}%
                </span>
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-xl bg-[#FFF7ED] px-3.5 py-2.5">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[#B54E00]">
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#EA8A00]">
                <Hourglass className="h-1.5 w-1.5 text-white" />
              </span>
              {t("company.maintenance.deck.overdue")}
            </dt>
            <dd className="text-sm font-extrabold text-[#0B1C30]">
              {formatCount(summary?.overdueVehicles ?? 0)}
            </dd>
          </div>
        </dl>

        {/* Action-required callout */}
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
            actionEvent
              ? "border-[#FFEDD5] bg-[#FFF7ED]"
              : "border-emerald-100 bg-emerald-50/60"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {actionEvent ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </span>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.maintenance.deck.actionRequired")}
              </div>
              {actionEvent ? (
                <div className="truncate text-sm font-semibold text-[#0B1C30]">
                  {vehicleShortTitle(actionEvent)}{" "}
                  <span className="font-normal text-[#9AA4B5]">
                    · {eventCodeOf(actionEvent)}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-emerald-800">
                  {t("company.maintenance.deck.noAction")}
                </div>
              )}
            </div>
          </div>
          {actionEvent && (
            <div className="flex shrink-0 items-center gap-2">
              <MaintenanceStatusChip status={actionEvent.dispatchStatus} />
              <button
                type="button"
                onClick={() => onSelect(actionEvent)}
                className="rounded-xl bg-[#0B1C30] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#213145] cursor-pointer"
              >
                {t("company.maintenance.deck.openRecord")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Right: Maintenance Expenses & Parts vs Labor */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
            {t("company.maintenance.expenses.title")}
          </h2>
          <div className="flex items-center gap-1 rounded-xl bg-[#F1F5F9] p-1">
            {timeframe.map((period) => (
              <button
                key={period}
                type="button"
                disabled
                title={t("company.maintenance.soon")}
                className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#9AA4B5]"
              >
                {period}
              </button>
            ))}
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]"
              title={t("company.maintenance.soon")}
            >
              <Sparkles className="h-3 w-3" />
              {t("company.maintenance.soon")}
            </span>
          </div>
        </div>

        {/* Real MTD figures */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ExpenseTile
            label={t("company.maintenance.expenses.mtd")}
            value={summary ? formatLYD(summary.mtdCost) : "—"}
            icon={<CircleDollarSign className="h-4 w-4" />}
            tone="bg-[#EFF4FF] text-[#2563EB]"
          />
          <ExpenseTile
            label={t("company.maintenance.expenses.avgPerUnit")}
            value={summary ? formatLYD(Math.round(summary.avgCostPerVehicle)) : "—"}
            icon={<Banknote className="h-4 w-4" />}
            tone="bg-emerald-50 text-emerald-700"
          />
          <ExpenseTile
            label={t("company.maintenance.expenses.completed")}
            value={summary ? formatCount(summary.completed14d) : "—"}
            icon={<BadgeCheck className="h-4 w-4" />}
            tone="bg-slate-100 text-slate-600"
          />
          <ExpenseTile
            label={t("company.maintenance.expenses.inProgress")}
            value={summary ? formatCount(summary.inProgress) : "—"}
            icon={<Wrench className="h-4 w-4" />}
            tone="bg-amber-50 text-amber-700"
          />
        </div>

        {/* Trend chart placeholder (unmodelled monthly series) */}
        <div className="mt-4 flex h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[#C3C6D7] bg-[#F8FAFC] text-center">
          <ClipboardList className="h-6 w-6 text-[#94A3B8]" />
          <p className="mt-2 max-w-[240px] text-xs font-semibold text-[#64748B]">
            {t("company.maintenance.expenses.trendSoon")}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#9AA4B5]">
          <Clock className="h-3.5 w-3.5" />
          {summary
            ? t("company.maintenance.expenses.asOf", { monthLabel: summary.monthLabel })
            : t("company.maintenance.expenses.loading")}
        </div>
      </section>
    </div>
  );
};

interface ExpenseTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}

const ExpenseTile: React.FC<ExpenseTileProps> = ({ label, value, icon, tone }) => (
  <div className="rounded-xl bg-[#F8FAFC] p-3">
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
        {label}
      </span>
    </div>
    <div className="mt-2 text-lg font-extrabold tracking-tight text-[#0B1C30]">
      {value}
      <span className="ml-1 text-[11px] font-bold text-[#565E74]">LYD</span>
    </div>
  </div>
);

export default CompanyMaintenanceHealthDeck;