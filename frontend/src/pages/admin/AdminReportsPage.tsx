import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  Activity,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  Car,
  ClipboardCheck,
  Download,
  ExternalLink,
  Landmark,
  Printer,
  RefreshCw,
  Repeat,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useAdminHub } from "../../context/adminHub";
import { useAdminReports } from "../../hooks/useAdminReports";
import { reportsCsv } from "../../lib/adminMetrics";
import { formatLYD, saveBlobAsFile } from "../../lib/bookingView";
import type {
  ReportPeriod,
  ReportsSummary,
  ReportTopCompanyRow,
  ReportTopVehicleRow,
} from "../../types/admin";

const PERIODS: ReportPeriod[] = ["month", "7d", "30d", "3m", "6m", "ytd"];

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(value ?? 0));

const pctLabel = (value: number): string => `${(value ?? 0).toFixed(1)}%`;

const periodKeyOf = (key: ReportPeriod): string => `admin.reports.periods.${key}`;

export const AdminReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hub } = useAdminHub();
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const { summary, loading, error, reload } = useAdminReports(period, hub);
  const [toast, setToast] = useState("");

  const scopeLabel = hub
    ? t("admin.reports.scopeLabel", { hub })
    : t("admin.reports.allHubs");

  const handleExport = () => {
    if (!summary) return;
    saveBlobAsFile(
      new Blob([reportsCsv(summary)], { type: "text/csv;charset=utf-8" }),
      `nexride-report-${summary.period.label}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    setToast(t("admin.reports.exportReport"));
    window.setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.reports.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.reports.grid")}
            </span>
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.reports.title")}
            <span className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-sm font-bold text-[#2563EB]">
              {t("admin.reports.subtitleChip")}
            </span>
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#565E74]">
            {t("admin.reports.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {scopeLabel}
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.reports.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!summary || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.reports.exportReport")}
          </button>
        </div>
      </div>

      {/* Period selector + honest comparison pill */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#EFF4FF] p-1">
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all cursor-pointer ${
                period === key
                  ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                  : "text-[#565E74] hover:bg-white"
              }`}
            >
              {t(periodKeyOf(key))}
            </button>
          ))}
        </div>

        {!loading && !error && summary && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#565E74]">{t("admin.reports.comparison.vsPrev")}</span>
            <DeltaBadge delta={summary.comparison.grossDeltaPct} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : error || !summary ? (
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <BarChart3 className="h-10 w-10 text-[#94A3B8]" />
          <p className="mt-4 max-w-md text-sm text-[#64748B]">
            {t("admin.reports.loadError")}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            {t("admin.reports.retry")}
          </button>
        </div>
      ) : (
        <ReportBody summary={summary} onNavigate={navigate} />
      )}

      {/* Local toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

const ReportBody: React.FC<{ summary: ReportsSummary; onNavigate: (to: string) => void }> = ({
  summary,
  onNavigate,
}) => {
  const { t, i18n } = useTranslation();
  const { funnel, financial, fleet, partners, renters, comparison, clearing } =
    summary;
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(
      new Date(iso),
    );

  return (
    <>
      {/* Executive KPI deck (6 cards — 5 light + 1 dark GMV tile) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label={t("admin.reports.kpis.bookings")}
          icon={<CalendarDays className="h-[18px] w-[18px]" />}
          iconTone="bg-[#E5EEFF] text-[#2563EB]"
          value={formatCount(funnel.total)}
          sub={t("admin.reports.kpis.bookingsSub", {
            done: formatCount(funnel.completed),
            active: formatCount(funnel.activeOnRoad),
            churn: funnel.churnPct.toFixed(1),
          })}
          progress={funnel.completionPct}
          barTone="bg-[#2563EB]"
          delta={comparison.bookingsDeltaPct}
        />
        <div className="flex min-h-[148px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-4 text-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              {t("admin.reports.kpis.gross")}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Banknote className="h-[18px] w-[18px] text-emerald-300" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tracking-tight">
              {formatLYD(financial.gross)}
            </span>
            <span className="text-xs font-bold text-emerald-300">LYD</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {t("admin.reports.kpis.grossSub", {
              net: `${formatLYD(financial.net)} LYD`,
            })}
          </div>
          <div className="mt-2">
            <DeltaBadge delta={comparison.grossDeltaPct} dark />
          </div>
        </div>
        <KpiCard
          label={t("admin.reports.kpis.commission")}
          icon={<Wallet className="h-[18px] w-[18px]" />}
          iconTone="bg-emerald-50 text-emerald-700"
          value={formatLYD(financial.cut)}
          suffix="LYD"
          sub={t("admin.reports.kpis.commissionSub", {
            rate: financial.takeRate.toFixed(1),
          })}
          progress={financial.takeRate}
          barTone="bg-emerald-600"
          delta={comparison.cutDeltaPct}
        />
        <KpiCard
          label={t("admin.reports.kpis.utilization")}
          icon={<Activity className="h-[18px] w-[18px]" />}
          iconTone="bg-amber-50 text-amber-700"
          value={`${fleet.utilizationPct.toFixed(1)}%`}
          sub={t("admin.reports.kpis.utilizationSub", {
            deployed: formatCount(fleet.deployedToday),
            size: formatCount(fleet.size),
          })}
          progress={fleet.utilizationPct}
          barTone="bg-amber-500"
        />
        <KpiCard
          label={t("admin.reports.kpis.renters")}
          icon={<Users className="h-[18px] w-[18px]" />}
          iconTone="bg-violet-50 text-violet-700"
          value={formatCount(renters.active)}
          sub={t("admin.reports.kpis.rentersSub", {
            retention: renters.retentionPct.toFixed(1),
          })}
          progress={renters.retentionPct}
          barTone="bg-violet-600"
        />
        <KpiCard
          label={t("admin.reports.kpis.partners")}
          icon={<Building2 className="h-[18px] w-[18px]" />}
          iconTone="bg-sky-50 text-sky-700"
          value={formatCount(partners.approved)}
          sub={t("admin.reports.kpis.partnersSub", {
            approved: formatCount(partners.approved),
            total: formatCount(partners.total),
          })}
          progress={partners.certifiedPct}
          barTone="bg-sky-600"
        />
      </div>

      {/* Revenue & Marketplace Volume chart + live insight rail */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-[#0B1C30]">
                {t("admin.reports.revenue.title")}
              </div>
              <div className="mt-0.5 text-xs text-[#565E74]">
                {t("admin.reports.revenue.subtitle")}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-[#565E74]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#0B1C30]" />
                {t("admin.reports.revenue.gmv")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2563EB]" />
                {t("admin.reports.revenue.cut")}
              </span>
            </div>
          </div>

          {summary.weekly.length === 0 ||
          summary.weekly.every((w) => w.gross === 0) ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
              <BarChart3 className="h-8 w-8 text-[#94A3B8]" />
              <p className="mt-2 text-sm text-[#64748B]">
                {t("admin.reports.revenue.noData")}
              </p>
            </div>
          ) : (
            <WeeklyRevenueBars weekly={summary.weekly} />
          )}

          {/* Weekday mini-series */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.reports.revenue.weekdayTitle")}
            </div>
            <div className="flex h-14 items-end gap-2">
              {summary.weekdaySeries.map((d, i) => {
                const maxDow = Math.max(1, ...summary.weekdaySeries.map((x) => x.gross));
                return (
                  <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end justify-center rounded-md bg-[#F1F5F9]">
                      <div
                        className="w-full rounded-md bg-[#2563EB]/70 transition-all"
                        style={{
                          height: `${d.gross > 0 ? Math.max(6, (d.gross / maxDow) * 100) : 3}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-[#565E74]">
                      {d.day.slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Insight rail */}
        <SectionCard>
          <div className="mb-3 text-sm font-extrabold text-[#0B1C30]">
            {t("admin.reports.revenue.clearing")}
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#565E74]">
                  {t("admin.reports.revenue.clearing")}
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#0B1C30]">
                {clearing.healthPct.toFixed(1)}%
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${Math.min(clearing.healthPct, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-[#565E74]">
                {t("admin.reports.revenue.clearingSub", {
                  pct: clearing.healthPct.toFixed(1),
                  ref: clearing.batchRef,
                })}
              </div>
            </div>

            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#565E74]">
                  {t("admin.reports.revenue.peakDay")}
                </span>
                <CalendarClock className="h-4 w-4 text-[#2563EB]" />
              </div>
              {funnel.peakDay ? (
                <>
                  <div className="mt-2 text-lg font-extrabold text-[#0B1C30]">
                    {fmtDay(funnel.peakDay.day)}
                  </div>
                  <div className="mt-1 text-xs text-[#565E74]">
                    {t("admin.reports.fulfillment.peakDay", {
                      day: fmtDay(funnel.peakDay.day),
                      count: formatCount(funnel.peakDay.count),
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm text-[#565E74]">
                  {t("admin.reports.fulfillment.none")}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#EFF4FF] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#565E74]">
                  {t("admin.reports.revenue.topRenter")}
                </span>
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              {renters.topRenter ? (
                <>
                  <div className="mt-2 truncate text-lg font-extrabold text-[#0B1C30]">
                    {renters.topRenter.name}
                  </div>
                  <div className="mt-1 text-xs text-[#565E74]">
                    {t("admin.reports.revenue.topRenterSub", {
                      count: formatCount(renters.topRenter.trips),
                      spend: `${formatLYD(renters.topRenter.spend)} LYD`,
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm text-[#565E74]">
                  {t("admin.reports.cohort.none")}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Fulfillment + Cohort deck */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FulfillmentCard summary={summary} />
        <CohortCard summary={summary} />
      </div>

      {/* Top companies */}
      <TopCompaniesTable companies={summary.topCompanies} />

      {/* Top vehicles */}
      <TopVehiclesTable vehicles={summary.topVehicles} onNavigate={onNavigate} />

      {/* Audit / reconciliation bar */}
      <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-5 text-white xl:flex-row xl:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Landmark className="h-5 w-5 text-emerald-300" />
          </span>
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {t("admin.reports.audit.certified")}
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-1 max-w-2xl text-xs text-slate-400">
              {t("admin.reports.audit.reconciliation", {
                ref: clearing.batchRef,
                pct: clearing.healthPct.toFixed(1),
              })}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          {t("admin.reports.audit.print")}
        </button>
      </div>
    </>
  );
};

// -----------------------------------------------------------------------------
// Weekly GMV + commission bars
// -----------------------------------------------------------------------------

const WeeklyRevenueBars: React.FC<{ weekly: ReportsSummary["weekly"] }> = ({
  weekly,
}) => {
  const maxGross = Math.max(1, ...weekly.map((w) => w.gross));
  return (
    <div className="flex h-48 items-end gap-2">
      {weekly.map((w, i) => {
        const gmvH = Math.max(w.gross > 0 ? 6 : 2, (w.gross / maxGross) * 100);
        const cutH = Math.max(w.cut > 0 ? 6 : 2, (w.cut / maxGross) * 100);
        return (
          <div
            key={`${w.start}-${i}`}
            className="flex h-full flex-1 flex-col justify-end gap-1"
          >
            <div
              className="w-full rounded-t-md bg-[#0B1C30] transition-all"
              style={{ height: `${gmvH}%` }}
              title={`GMV ${formatLYD(w.gross)}`}
            />
            <div
              className="w-full rounded-t-md bg-[#2563EB]"
              style={{ height: `${cutH}%` }}
              title={`Commission ${formatLYD(w.cut)}`}
            />
            <div className="mt-2 text-center text-[10px] font-semibold text-[#565E74]">
              {w.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Fulfillment deck
// -----------------------------------------------------------------------------

const FulfillmentCard: React.FC<{ summary: ReportsSummary }> = ({ summary }) => {
  const { t } = useTranslation();
  const { funnel } = summary;
  const total = Math.max(1, funnel.total);
  const segments = [
    { key: "completed", count: funnel.completed, cls: "bg-emerald-500" },
    { key: "activeOnRoad", count: funnel.activeOnRoad, cls: "bg-[#2563EB]" },
    { key: "pending", count: funnel.pending, cls: "bg-amber-500" },
    { key: "cancelled", count: funnel.cancelled, cls: "bg-slate-300" },
  ];
  return (
    <SectionCard>
      <div className="mb-4 text-sm font-extrabold text-[#0B1C30]">
        {t("admin.reports.fulfillment.title")}
        <div className="mt-0.5 text-xs font-normal text-[#565E74]">
          {t("admin.reports.fulfillment.subtitle")}
        </div>
      </div>
      {funnel.total === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
          <ClipboardCheck className="h-8 w-8 text-[#94A3B8]" />
          <p className="mt-2 text-sm text-[#64748B]">
            {t("admin.reports.fulfillment.none")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {segments.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.key}
                  className={s.cls}
                  style={{ width: `${(s.count / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-5 space-y-3">
            {segments.map((r) => (
              <div key={r.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${r.cls}`} />
                  <span className="text-sm font-semibold text-[#0B1C30]">
                    {t(`admin.reports.fulfillment.${r.key}`)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-[#0B1C30]">
                    {formatCount(r.count)}
                  </span>
                  <span className="text-xs font-semibold text-[#565E74]">
                    {((r.count / total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
};

// -----------------------------------------------------------------------------
// Cohort deck
// -----------------------------------------------------------------------------

const CohortCard: React.FC<{ summary: ReportsSummary }> = ({ summary }) => {
  const { t } = useTranslation();
  const { renters } = summary;
  const total = Math.max(1, renters.active);
  const hasRenters = renters.active > 0;
  return (
    <SectionCard>
      <div className="mb-4 text-sm font-extrabold text-[#0B1C30]">
        {t("admin.reports.cohort.title")}
        <div className="mt-0.5 text-xs font-normal text-[#565E74]">
          {t("admin.reports.cohort.subtitle")}
        </div>
      </div>
      {!hasRenters ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
          <Repeat className="h-8 w-8 text-[#94A3B8]" />
          <p className="mt-2 text-sm text-[#64748B]">{t("admin.reports.cohort.none")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#E5EEFF] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                {t("admin.reports.cohort.returningRenters")}
              </div>
              <div className="mt-1 text-2xl font-extrabold text-[#0B1C30]">
                {formatCount(renters.returning)}
              </div>
            </div>
            <div className="rounded-xl bg-violet-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                {t("admin.reports.cohort.newRenters")}
              </div>
              <div className="mt-1 text-2xl font-extrabold text-[#0B1C30]">
                {formatCount(renters.new)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label={t("admin.reports.kpis.renters")}
              value={formatCount(total)}
            />
            <StatTile
              label={t("admin.reports.cohort.retention")}
              value={pctLabel(renters.retentionPct)}
            />
            <StatTile
              label={t("admin.reports.cohort.avgSpend")}
              value={formatLYD(renters.avgSpendPerClient)}
            />
            <StatTile
              label={t("admin.reports.cohort.ltv")}
              value={formatLYD(renters.ltv)}
            />
          </div>
        </>
      )}
    </SectionCard>
  );
};

// -----------------------------------------------------------------------------
// Top companies table
// -----------------------------------------------------------------------------

const TopCompaniesTable: React.FC<{ companies: ReportTopCompanyRow[] }> = ({
  companies,
}) => {
  const { t } = useTranslation();
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-6 py-4">
        <div>
          <div className="text-sm font-extrabold text-[#0B1C30]">
            {t("admin.reports.topCompanies.title")}
          </div>
          <div className="mt-0.5 text-xs text-[#565E74]">
            {t("admin.reports.topCompanies.subtitle")}
          </div>
        </div>
        <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
          {formatCount(companies.length)}
        </span>
      </div>

      {companies.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <Building2 className="h-8 w-8 text-[#94A3B8]" />
          <p className="mt-2 text-sm text-[#64748B]">
            {t("admin.reports.topCompanies.noData")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-t border-slate-100 bg-[#F8FAFC] text-left text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                <th className="px-4 py-3">{t("admin.reports.topCompanies.rank")}</th>
                <th className="px-4 py-3">{t("admin.reports.topCompanies.partner")}</th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topCompanies.bookings")}
                </th>
                <th className="px-4 py-3 text-right">{t("admin.reports.topCompanies.gmv")}</th>
                <th className="px-4 py-3 text-right">{t("admin.reports.topCompanies.cut")}</th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topCompanies.avgTicket")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topCompanies.completion")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topCompanies.activeNow")}
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr
                  key={c._id}
                  className="border-t border-slate-100 transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF4FF] text-xs font-extrabold text-[#2563EB]">
                      {c.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                        <Building2 className="h-4 w-4 text-[#2563EB]" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#0B1C30]">{c.name}</div>
                        <div className="text-xs text-[#565E74]">
                          {c.city || t("admin.reports.allHubs")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0B1C30]">
                    {formatCount(c.bookings)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0B1C30]">
                    {formatLYD(c.gross)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#565E74]">
                    {formatLYD(c.cut)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#565E74]">
                    {formatLYD(c.avgTicket)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-[#0B1C30]">
                        {c.completionPct.toFixed(0)}%
                      </span>
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#EFF4FF]">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(c.completionPct, 100)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.activeNow > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        {formatCount(c.activeNow)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// -----------------------------------------------------------------------------
// Top vehicles table
// -----------------------------------------------------------------------------

const TopVehiclesTable: React.FC<{
  vehicles: ReportTopVehicleRow[];
  onNavigate: (to: string) => void;
}> = ({ vehicles, onNavigate }) => {
  const { t } = useTranslation();
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-6 py-4">
        <div>
          <div className="text-sm font-extrabold text-[#0B1C30]">
            {t("admin.reports.topVehicles.title")}
          </div>
          <div className="mt-0.5 text-xs text-[#565E74]">
            {t("admin.reports.topVehicles.subtitle")}
          </div>
        </div>
        <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
          {formatCount(vehicles.length)}
        </span>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <Car className="h-8 w-8 text-[#94A3B8]" />
          <p className="mt-2 text-sm text-[#64748B]">
            {t("admin.reports.topVehicles.noData")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-t border-slate-100 bg-[#F8FAFC] text-left text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                <th className="px-4 py-3">{t("admin.reports.topVehicles.rank")}</th>
                <th className="px-4 py-3">{t("admin.reports.topVehicles.vehicle")}</th>
                <th className="px-4 py-3">{t("admin.reports.topVehicles.operator")}</th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topVehicles.bookings")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topVehicles.rentalDays")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topVehicles.revenue")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topVehicles.utilization")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("admin.reports.topVehicles.dailyRate")}
                </th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v._id}
                  className="border-t border-slate-100 transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF4FF] text-xs font-extrabold text-[#2563EB]">
                      {v.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {v.vehicle.photoUrl ? (
                        <img
                          src={v.vehicle.photoUrl}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                          <Car className="h-5 w-5 text-[#94A3B8]" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#0B1C30]">
                          {v.vehicle.make} {v.vehicle.model} ({v.vehicle.year})
                        </div>
                        <div className="text-xs text-[#565E74]">
                          {[v.vehicle.type, v.vehicle.transmission, v.vehicle.fuelType]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate text-[#0B1C30]">{v.operator.name}</div>
                    <div className="text-xs text-[#565E74]">{v.operator.city}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0B1C30]">
                    {formatCount(v.bookings)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#565E74]">
                    {formatCount(v.rentalDays)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0B1C30]">
                    {formatLYD(v.revenue)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-[#0B1C30]">
                        {v.utilizationPct.toFixed(0)}%
                      </span>
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#EFF4FF]">
                        <span
                          className="block h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${Math.min(v.utilizationPct, 100)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[#565E74]">
                    {formatLYD(v.vehicle.dailyPrice ?? v.avgRate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigate("/admin/maintenance")}
                      title={t("admin.reports.topVehicles.viewFleet")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  icon: React.ReactNode;
  iconTone: string;
  value: string;
  suffix?: string;
  sub: React.ReactNode;
  progress: number;
  barTone: string;
  delta?: number | null;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  icon,
  iconTone,
  value,
  suffix,
  sub,
  progress,
  barTone,
  delta,
}) => (
  <div className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-[#565E74]">{label}</span>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-2xl font-extrabold tracking-tight text-[#0B1C30]">{value}</span>
      {suffix && <span className="text-xs font-bold text-[#565E74]">{suffix}</span>}
    </div>
    <div className="mt-1 text-xs text-[#565E74]">{sub}</div>
    <div className="mt-3 flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
        <div
          className={`h-full rounded-full ${barTone} transition-all`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {typeof delta === "number" && <DeltaBadge delta={delta} />}
    </div>
  </div>
);

const DeltaBadge: React.FC<{ delta: number | null; dark?: boolean }> = ({
  delta,
  dark,
}) => {
  if (delta === null) {
    return (
      <span className="shrink-0 text-[10px] font-semibold text-[#94A3B8]">—</span>
    );
  }
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone = dark
    ? up
      ? "text-emerald-300"
      : "text-red-300"
    : up
      ? "text-emerald-600"
      : "text-red-600";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-xs font-extrabold ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {(delta * 100).toFixed(1)}%
    </span>
  );
};

const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-extrabold text-[#0B1C30]">{value}</div>
  </div>
);

const SectionCard: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${className ?? ""}`}
  >
    {children}
  </div>
);

export default AdminReportsPage;