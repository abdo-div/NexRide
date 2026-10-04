import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarDays,
  CircleX,
  Download,
  Landmark,
  ListFilter,
  Percent,
  RefreshCw,
  RotateCcw,
  Search,
  Siren,
  Truck,
  Wallet,
} from "lucide-react";
import { useAdminCommissions } from "../../hooks/useAdminCommissions";
import {
  adminApi,
} from "../../lib/adminApi";
import { payoutsCsv, paymentsCsv } from "../../lib/adminMetrics";
import { saveBlobAsFile } from "../../lib/bookingView";
import {
  idOf,
  payoutCodeOf,
  rowCompanyIdOf,
} from "../../lib/commissionView";
import { AdminPayoutsTable } from "../../components/admin/AdminPayoutsTable";
import { AdminPayoutDossier } from "../../components/admin/AdminPayoutDossier";
import { CommissionFlow } from "../../components/admin/CommissionFlow";
import type { AdminPayoutRow } from "../../types/admin";

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "ADJUSTED",
  "CLEARED",
] as const;
const CYCLE_OPTIONS = ["monthly", "biweekly", "week"] as const;

export const AdminCommissionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data, loading, error, reload } = useAdminCommissions();
  const { payments, bookings, companies, customers, vehicles, summary, ledger } = data;

  const [search, setSearch] = useState("");
  const [partner, setPartner] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [cycle, setCycle] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const dossierRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const resetPage = () => setPage(1);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3000);
  };

  // -------------------------------------------------------------------------
  // Filtered clearing ledger (search + real filters or derived windows)
  // -------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(i18n.language);
    return ledger
      .filter((row) => status === "ALL" || row.payoutStatus === status)
      .filter(
        (row) =>
          partner === "ALL" ||
          rowCompanyIdOf(row) === partner,
      )
      .filter((row) => inCycle(row, cycle))
      .filter((row) => {
        if (!needle) return true;
        const company = row.company?.name ?? "";
        const city = row.company?.city ?? "";
        const code = payoutCodeOf(row).toLocaleLowerCase(i18n.language);
        const hay = [company, city, code]
          .join(" ")
          .toLocaleLowerCase(i18n.language);
        return hay.includes(needle);
      });
  }, [ledger, status, partner, cycle, search, i18n.language]);

  // -------------------------------------------------------------------------
  // Selected settlement run (remembered, else most recent)
  // -------------------------------------------------------------------------
  const selected = useMemo(() => {
    if (filtered.length === 0) return undefined;
    return filtered.find((r) => r.companyId === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const handleSelect = (row: AdminPayoutRow) => setSelectedId(row.companyId ?? "");

  const openDossier = (row: AdminPayoutRow) => {
    setSelectedId(row.companyId ?? "");
    requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // -------------------------------------------------------------------------
  // Actions: export CSV, generate LFB batch, approve & settle, audit print
  // -------------------------------------------------------------------------
  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([payoutsCsv(filtered)], { type: "text/csv;charset=utf-8" }),
      `nexride-clearing-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleClear = () => {
    setSearch("");
    setPartner("ALL");
    setStatus("ALL");
    setCycle("ALL");
    resetPage();
  };

  const handleDispatchBatch = async () => {
    if (!window.confirm(t("admin.commissions.toast.dispatchConfirmTitle"))) return;
    setBusy(true);
    try {
      const res = await adminApi.dispatchPayoutBatch();
      const batch = res.data.batch;
      showToast(
        t("admin.commissions.toast.dispatchSuccess", {
          ref: batch.batchRef,
          count: batch.dispatched,
        }),
      );
      reload();
    } catch {
      showToast(t("admin.commissions.toast.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const handleApproveSettle = async (row: AdminPayoutRow) => {
    const count = row.bookings;
    if (!window.confirm(t("admin.commissions.toast.settleConfirmTitle"))) return;
    setBusy(true);
    try {
      await adminApi.settlePayoutBatch(rowCompanyIdOf(row) || undefined);
      showToast(
        t("admin.commissions.toast.settleSuccess", { count }),
      );
      reload();
    } catch {
      showToast(t("admin.commissions.toast.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const handleAudit = (row: AdminPayoutRow) => {
    if (busy) return;
    showToast(t("admin.commissions.toast.auditInfo"));
    const rows = payments.filter((p) => idOf(p.companyId) === rowCompanyIdOf(row));
    if (rows.length === 0) return;
    saveBlobAsFile(
      new Blob([paymentsCsv(rows, bookings, [], companies)], {
        type: "text/csv;charset=utf-8",
      }),
      `${payoutCodeOf(row).toLowerCase()}-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const partnerOptions = useMemo(
    () =>
      ledger
        .map((row) => ({
          value: rowCompanyIdOf(row),
          label: row.company?.name ?? payoutCodeOf(row),
        }))
        .filter((o) => o.value),
    [ledger],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.commissions.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.commissions.grid")}
            </span>
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.commissions.title")}
            <span className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-sm font-bold text-[#2563EB]">
              {t("admin.commissions.subtitleChip")}
            </span>
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#565E74]">
            {t("admin.commissions.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("admin.commissions.engineName")} — {t("admin.commissions.engineLive")}
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.commissions.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.commissions.exportLedger")}
          </button>
          <button
            type="button"
            onClick={handleDispatchBatch}
            disabled={busy || loading || (summary?.pendingPayouts ?? 0) <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Truck className="h-4 w-4" />
            {t("admin.commissions.generateBatch")}
          </button>
        </div>
      </div>

      {/* KPI bento (6 cards) */}
      {!loading && !error && summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label={t("admin.commissions.kpis.gross")}
            icon={<Banknote className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={formatLydCompact(summary.gross)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.bookingsSettled", {
              count: summary.bookings,
            })}
            progress={100}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.commissions.kpis.platformTake")}
            icon={<Percent className="h-[18px] w-[18px]" />}
            iconTone="bg-slate-100 text-slate-600"
            value={formatLydCompact(summary.platformTake)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.avgRate", {
              rate: summary.effectiveRate.toFixed(1),
            })}
            progress={summary.effectiveRate}
            barTone="bg-slate-500"
          />
          <KpiCard
            label={t("admin.commissions.kpis.companyEarnings")}
            icon={<Wallet className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={formatLydCompact(summary.companyEarnings)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.sharedAcross", {
              count: summary.partnerCount,
            })}
            progress={pct(summary.companyEarnings, Math.max(summary.gross, 1))}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.commissions.kpis.pending")}
            icon={<RefreshCw className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-amber-700"
            value={formatLydCompact(summary.pendingPayouts)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.batchScheduled")}
            progress={pct(
              summary.pendingPayouts,
              Math.max(summary.pendingPayouts + summary.paidPayouts, 1),
            )}
            barTone="bg-amber-500"
          />
          <KpiCard
            label={t("admin.commissions.kpis.paid")}
            icon={<Landmark className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-700"
            value={formatLydCompact(summary.paidPayouts)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.viaRails")}
            progress={Math.round(summary.paidRatio)}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.commissions.kpis.adjustments")}
            icon={<CircleX className="h-[18px] w-[18px]" />}
            iconTone="bg-red-50 text-[#BA1A1A]"
            value={formatLydCompact(summary.adjustments)}
            suffix={t("admin.commissions.kpis.lyd")}
            sub={t("admin.commissions.kpis.adjustmentsSub")}
            progress={pct(summary.adjustments, Math.max(summary.gross, 1))}
            barTone="bg-[#BA1A1A]"
          />
        </div>
      )}

      {/* Capital settlement architecture */}
      {!loading && !error && summary && (
        <div className="mb-6">
          <CommissionFlow summary={summary} />
        </div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <div className="relative min-w-[280px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#565E74]">
              <Search className="h-[18px] w-[18px]" />
            </div>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder={t("admin.commissions.filters.searchPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label={t("admin.commissions.filters.allPartners")}
              icon={<Wallet className="h-4 w-4" />}
              value={partner}
              onChange={(v) => {
                setPartner(v);
                resetPage();
              }}
              options={partnerOptions}
              allLabel={t("admin.commissions.filters.allPartners")}
            />
            <FilterSelect
              label={t("admin.commissions.filters.allStatuses")}
              icon={<ListFilter className="h-4 w-4" />}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: t(`admin.commissions.statuses.${s}`),
              }))}
              allLabel={t("admin.commissions.filters.allStatuses")}
            />
            <FilterSelect
              label={t("admin.commissions.filters.cycle")}
              icon={<CalendarDays className="h-4 w-4" />}
              value={cycle}
              onChange={(v) => {
                setCycle(v);
                resetPage();
              }}
              options={CYCLE_OPTIONS.map((c) => ({
                value: c,
                label: t(`admin.commissions.filters.cycle${c[0].toUpperCase()}${c.slice(1)}`),
              }))}
              allLabel={t("admin.commissions.filters.cycleMonthly")}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.commissions.filters.reset")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Clearing ledger */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-[#0B1C30]">
              {t("admin.commissions.table.title")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
              {t("admin.commissions.count", { count: filtered.length })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#565E74]">
            <Siren className="h-4 w-4 text-[#2563EB]" />
            <span>{t("admin.commissions.engineName")}</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-96 flex-col items-center justify-center text-center">
            <Wallet className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("admin.commissions.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("admin.commissions.retry")}
            </button>
          </div>
        ) : (
          <div className="p-6 pt-0">
            <AdminPayoutsTable
              rows={filtered}
              selectedId={selected?.companyId ?? ""}
              onSelect={handleSelect}
              openDossier={(row) => openDossier(row)}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              emptyLabel={t("admin.commissions.table.empty")}
            />
          </div>
        )}
      </section>

      {/* Settlement dossier */}
      <div ref={dossierRef} className="mt-6 scroll-mt-6">
        {!loading && !error && selected ? (
          <AdminPayoutDossier
            row={selected}
            payments={payments}
            customers={customers}
            bookings={bookings}
            vehicles={vehicles}
            busy={busy}
            onApprove={(row) => handleApproveSettle(row)}
            onAudit={(row) => handleAudit(row)}
          />
        ) : !loading && !error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
            <Landmark className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm text-[#64748B]">
              {t("admin.commissions.table.empty")}
            </p>
          </div>
        ) : null}
      </div>

      {/* Local toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

const pct = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/** Whether a settlement run falls inside the selected derived window. */
const inCycle = (row: AdminPayoutRow, cycle: string): boolean => {
  if (cycle === "ALL") return true;
  const at = new Date(
    row.lastPayoutSetAt ?? row.lastPaidAt ?? "",
  ).getTime();
  if (!at) return false;
  const span = cycle === "monthly" ? 30 : cycle === "biweekly" ? 14 : 7;
  return at >= Date.now() - span * 86400000;
};

const formatLydCompact = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

interface KpiCardProps {
  label: string;
  icon: React.ReactNode;
  iconTone: string;
  value: string;
  suffix: string;
  sub: React.ReactNode;
  progress: number;
  barTone: string;
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
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-[#565E74]">{label}</span>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-2xl font-extrabold tracking-tight text-[#0B1C30]">
        {value}
      </span>
      <span className="text-xs font-bold text-[#565E74]">{suffix}</span>
    </div>
    <div className="mt-1 text-xs text-[#565E74]">{sub}</div>
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
      <div
        className={`h-full rounded-full ${barTone} transition-all`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  </div>
);

interface FilterSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  icon,
  value,
  onChange,
  options,
  allLabel,
}) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#565E74]">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl bg-[#EFF4FF] py-2.5 pl-10 pr-8 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
      >
        <option value="ALL">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#565E74]">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  </div>
);

export default AdminCommissionsPage;