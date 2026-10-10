import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Banknote,
  Car,
  CheckCircle2,
  Download,
  Gauge,
  RefreshCw,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAdminData } from "../../hooks/useAdminData";
import {
  buildChartSeries,
  buildFeed,
  buildMetrics,
  bookingsCsv,
  filterByHub,
  type ActivePeriod,
  type CustomWindow,
} from "../../lib/adminMetrics";
import { formatLYD, saveBlobAsFile } from "../../lib/bookingView";
import { useAdminHub } from "../../context/adminHub";
import { AdminKpiCard } from "../../components/admin/AdminKpiCard";
import { AdminChart, type ChartMetric } from "../../components/admin/AdminChart";
import { AdminFeed } from "../../components/admin/AdminFeed";
import { AdminBookingsTable } from "../../components/admin/AdminBookingsTable";
import { AdminBookingDrawer } from "../../components/admin/AdminBookingDrawer";
import type { BookingDto } from "../../types/booking";

const PERIODS: ActivePeriod[] = ["today", "7d", "30d"];

export const AdminOverviewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data, loading, error, reload } = useAdminData();
  const { hub } = useAdminHub();

  const [period, setPeriod] = useState<ActivePeriod>("today");
  const [custom, setCustom] = useState<CustomWindow>(() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    const to = new Date();
    const iso = (d: Date): string => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to) };
  });
  const [metric, setMetric] = useState<ChartMetric>("bookings");
  const [viewing, setViewing] = useState<BookingDto | null>(null);

  const filtered = useMemo(() => filterByHub(data, hub), [data, hub]);

  const metrics = useMemo(
    () => buildMetrics(filtered, period, custom),
    [filtered, period, custom],
  );

  const chartSeries = useMemo(
    () => buildChartSeries(filtered, period, i18n.language, custom),
    [filtered, period, i18n.language, custom],
  );

  const feed = useMemo(
    () => buildFeed(filtered.companies, filtered.vehicles),
    [filtered],
  );

  const recent = useMemo(
    () =>
      [...filtered.bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [filtered.bookings],
  );

  const availableTiles = useMemo(() => {
    const byCity = new Map<string, { total: number; available: number }>();
    filtered.vehicles.forEach((v) => {
      const entry = byCity.get(v.city) ?? { total: 0, available: 0 };
      entry.total += 1;
      if (v.operationalStatus === "AVAILABLE") entry.available += 1;
      byCity.set(v.city, entry);
    });
    return Array.from(byCity.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([city, { total, available }]) => ({
        city,
        pct: total > 0 ? Math.round((available / total) * 100) : 0,
      }));
  }, [filtered.vehicles]);

  const handleExport = () => {
    if (filtered.bookings.length === 0) return;
    saveBlobAsFile(
      new Blob([bookingsCsv(filtered.bookings)], {
        type: "text/csv;charset=utf-8",
      }),
      `nexride-admin-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.overview.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.overview.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.overview.title")}
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-[#565E74]">
            {t("admin.overview.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-[#EFF4FF] p-1 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                  period === p
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-[#565E74] hover:text-[#0B1C30]"
                }`}
              >
                {t(`admin.overview.period.${p}`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPeriod("custom")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                period === "custom"
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#565E74] hover:text-[#0B1C30]"
              }`}
            >
              {t("admin.overview.period.custom")}
            </button>
          </div>

          {period === "custom" && (
            <div className="inline-flex items-center gap-1 rounded-xl bg-[#EFF4FF] p-1.5 text-sm">
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                aria-label={t("admin.overview.period.customFrom")}
                className="cursor-pointer rounded-lg border-0 bg-white px-2 py-1 text-xs font-semibold text-[#0B1C30] outline-none"
              />
              <span className="text-[#565E74]">→</span>
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                aria-label={t("admin.overview.period.customTo")}
                className="cursor-pointer rounded-lg border-0 bg-white px-2 py-1 text-xs font-semibold text-[#0B1C30] outline-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.overview.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.bookings.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.overview.export")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
          <Activity className="h-10 w-10 text-[#94A3B8]" />
          <p className="mt-4 max-w-md text-sm text-[#64748B]">{t("admin.overview.loadError")}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            {t("admin.overview.retry")}
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <AdminKpiCard
              labelKey="admin.kpis.bookingsToday"
              icon={Car}
              value={metrics.periodBookings}
              delta={metrics.bookingDelta}
              deltaNeutralKey="admin.kpis.noBaseline"
              sub={t("admin.kpis.confirmedActive", {
                confirmed: metrics.confirmedInPeriod,
                active: metrics.activeInPeriod,
              })}
            />
            <AdminKpiCard
              labelKey="admin.kpis.activeRentals"
              icon={Gauge}
              value={metrics.activeRentals}
              progress={metrics.utilizationPct}
              sub={t("admin.kpis.onRoad")}
            />
            <AdminKpiCard
              labelKey="admin.kpis.availableFleet"
              icon={CheckCircle2}
              tone="emerald"
              value={metrics.availableFleet}
              sub={t("admin.kpis.readyFleet")}
            />
            <AdminKpiCard
              labelKey="admin.kpis.inMaintenance"
              icon={Wrench}
              tone="amber"
              value={metrics.maintenanceCount}
              sub={t("admin.kpis.quarantined")}
            />
            <AdminKpiCard
              labelKey="admin.kpis.revenueToday"
              icon={Wallet}
              value={formatLYD(metrics.revenueGross)}
              valueSuffix="LYD"
              delta={metrics.revenueDelta}
              deltaNeutralKey="admin.kpis.noBaseline"
              sub={t("admin.kpis.revenueNet", { value: formatLYD(metrics.revenueNet) })}
            />
            <AdminKpiCard
              labelKey="admin.kpis.pendingPayouts"
              icon={Banknote}
              value={formatLYD(metrics.pendingPayouts)}
              valueSuffix="LYD"
              sub={t("admin.kpis.payoutPartners", { count: metrics.payoutPartners })}
            />
          </section>

          {/* Chart + feed */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] lg:col-span-7">
              <div>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-[#0B1C30]">
                      {t("admin.chart.title")}
                    </h2>
                    <p className="mt-0.5 text-sm text-[#565E74]">
                      {t("admin.chart.subtitle")}
                    </p>
                  </div>
                  <div className="inline-flex items-center bg-[#EFF4FF] p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setMetric("bookings")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        metric === "bookings"
                          ? "bg-white text-[#2563EB] shadow-sm"
                          : "text-[#565E74] hover:text-[#0B1C30]"
                      }`}
                    >
                      {t("admin.chart.toggleBookings")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetric("revenue")}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        metric === "revenue"
                          ? "bg-white text-[#2563EB] shadow-sm"
                          : "text-[#565E74] hover:text-[#0B1C30]"
                      }`}
                    >
                      {t("admin.chart.toggleRevenue")}
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-[#EFF4FF] px-2.5 py-1 font-semibold text-[#2563EB]">
                    {t("admin.chart.totalBookings", { count: metrics.periodBookings })}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                    {t("admin.chart.totalRevenue", {
                      value: formatLYD(metrics.revenueGross),
                    })}
                  </span>
                </div>

                <AdminChart
                  points={chartSeries.points}
                  maxValue={metric === "bookings" ? chartSeries.maxCount : chartSeries.maxRevenue}
                  metric={metric}
                  lang={i18n.language}
                  emptyLabel={t("admin.chart.empty")}
                />
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 text-xs sm:flex-row">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0B1C30]">{t("admin.chart.saturation")}</div>
                    <div className="text-[#565E74]">
                      {availableTiles.length === 0
                        ? t("admin.chart.noFleet")
                        : availableTiles
                            .slice(0, 3)
                            .map((tile) => `${tile.city} (${tile.pct}%)`)
                            .join(" • ")}
                    </div>
                  </div>
                </div>
                <span className="flex items-center gap-2 text-[#565E74]">
                  {t("admin.chart.updated")}
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            </section>

            <div className="lg:col-span-5">
              <AdminFeed items={feed} />
            </div>
          </div>

          {/* Recent bookings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
                  {t("admin.table.recentTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-[#565E74]">{t("admin.table.recentSubtitle")}</p>
              </div>
              <span className="self-start rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB] lg:self-auto">
                {t("admin.table.unitBadge", { count: recent.length })}
              </span>
            </div>

            <AdminBookingsTable
              bookings={recent}
              // The Overview shows a fixed "recent activity" preview rather than
              // a full register, so it reports its own single-window metadata
              // and hides the page controls.
              pagination={{
                page: 1,
                limit: recent.length,
                total: recent.length,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              }}
              onPageChange={() => undefined}
              onView={setViewing}
              emptyLabel={t("admin.table.empty")}
            />
          </section>
        </>
      )}

      <AdminBookingDrawer booking={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};

export default AdminOverviewPage;