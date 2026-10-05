import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileDown,
  ListFilter,
  Lock,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAdminPayments } from "../../hooks/useAdminPayments";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { adminApi } from "../../lib/adminApi";
import { paymentsCsv } from "../../lib/adminMetrics";
import { saveBlobAsFile, formatDate } from "../../lib/bookingView";
import { buildPaymentMetrics } from "../../lib/paymentMetrics";
import {
  bookingOfPayment,
  paymentMethodsOf,
} from "../../lib/paymentView";
import { AdminPaymentsTable } from "../../components/admin/AdminPaymentsTable";
import { PaymentDossierPanel } from "../../components/admin/PaymentDossierPanel";
import type { AdminPaymentDto } from "../../types/admin";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"] as const;
const RANGE_OPTIONS = ["ALL", "today", "7d", "30d"] as const;

export const AdminPaymentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    data,
    loading: registryLoading,
    error: registryError,
    reload: reloadRegistry,
  } = useAdminPayments();
  const {
    payments: referencePayments,
    bookings,
    customers,
    companies,
  } = data;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [provider, setProvider] = useState("ALL");
  const [range, setRange] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const dossierRef = useRef<HTMLDivElement>(null);

  const methods = useMemo(() => paymentMethodsOf(referencePayments), [referencePayments]);
  const metrics = useMemo(() => buildPaymentMetrics(referencePayments), [referencePayments]);

  const resetPage = () => setPage(1);

  const queryKey = useMemo(
    () => ({ page, limit: PAGE_SIZE, search, status, method, provider, range }),
    [page, search, status, method, provider, range],
  );
  const fetchPage = useCallback(
    async (signal: AbortSignal) => {
      const res = await adminApi.listCommissions(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status,
          paymentMethod: method,
          companyId: provider,
          range,
        },
        signal,
      );
      return { rows: res.data.payments ?? [], pagination: res.pagination };
    },
    [page, search, status, method, provider, range],
  );
  const {
    rows: payments,
    pagination,
    loading: pageLoading,
    error: pageError,
    reload: reloadPage,
  } = usePaginatedList<AdminPaymentDto>(fetchPage, queryKey);
  const filtered = payments;
  const loading = registryLoading || pageLoading;
  const error = registryError || pageError;
  const reload = useCallback(() => {
    reloadRegistry();
    reloadPage();
  }, [reloadRegistry, reloadPage]);

  // -------------------------------------------------------------------------
  // Selected transaction (remembered, else most recent)
  // -------------------------------------------------------------------------
  const selected = useMemo(() => {
    if (filtered.length === 0) return undefined;
    return filtered.find((p) => p._id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const handleSelect = (payment: AdminPaymentDto) => {
    setSelectedId(payment._id);
  };

  const openDossier = (payment: AdminPaymentDto) => {
    setSelectedId(payment._id);
    requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const viewBooking = (payment: AdminPaymentDto) => {
    const booking = bookingOfPayment(bookings, payment);
    if (booking) navigate(`/admin/bookings/${booking._id}`);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([paymentsCsv(filtered, bookings, customers, companies)], {
        type: "text/csv;charset=utf-8",
      }),
      `nexride-admin-payments-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleClear = () => {
    setSearch("");
    setStatus("ALL");
    setMethod("ALL");
    setProvider("ALL");
    setRange("ALL");
    resetPage();
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.payments.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.payments.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.payments.title")}
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-[#565E74]">
            {t("admin.payments.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.payments.count", { count: pagination.total })}
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.payments.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.payments.export")}
          </button>
        </div>
      </div>

      {/* KPI bento (5 cards) */}
      {!loading && !error && referencePayments.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={t("admin.payments.kpis.gross")}
            icon={<Banknote className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={formatLydCompact(metrics.gross)}
            suffix={t("admin.payments.kpis.lyd")}
            sub={
              metrics.grossDelta !== null ? (
                <>
                  <span className={`font-bold ${metrics.grossDelta >= 0 ? "text-emerald-700" : "text-[#BA1A1A]"}`}>
                    {metrics.grossDelta >= 0 ? "▲" : "▼"} {Math.abs(metrics.grossDelta)}%
                  </span>
                  <span> • </span>
                  <span>{t("admin.payments.kpis.vsLastMonth")}</span>
                </>
              ) : (
                t("admin.payments.kpis.noBaseline")
              )
            }
            progress={pct(metrics.gross, Math.max(metrics.gross, 1))}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.payments.kpis.successful")}
            icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={String(metrics.successCount)}
            suffix={t("admin.payments.kpis.operations", { count: metrics.successCount })}
            sub={t("admin.payments.kpis.successRate", { pct: metrics.successRate })}
            progress={metrics.successRate}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.payments.kpis.escrow")}
            icon={<Lock className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-amber-700"
            value={formatLydCompact(metrics.escrowSum)}
            suffix={t("admin.payments.kpis.lyd")}
            sub={t("admin.payments.kpis.escrowSub", { count: metrics.escrowCount })}
            progress={pct(metrics.escrowCount, Math.max(referencePayments.length, 1))}
            barTone="bg-amber-500"
          />
          <KpiCard
            label={t("admin.payments.kpis.failed")}
            icon={<XCircleIcon className="h-[18px] w-[18px]" />}
            iconTone="bg-red-50 text-[#BA1A1A]"
            value={String(metrics.failedCount)}
            suffix={t("admin.payments.kpis.failedSub", {
              count: metrics.failedCount,
              amount: formatLydCompact(metrics.failedSum),
            })}
            sub={t("admin.payments.kpis.failureRate", { pct: metrics.failureRate })}
            progress={metrics.failureRate}
            barTone="bg-[#BA1A1A]"
          />
          <KpiCard
            label={t("admin.payments.kpis.refunded")}
            icon={<Receipt className="h-[18px] w-[18px]" />}
            iconTone="bg-slate-100 text-slate-500"
            value={formatLydCompact(metrics.refundedSum)}
            suffix={t("admin.payments.kpis.lyd")}
            sub={t("admin.payments.kpis.refundedSub", { count: metrics.refundedCount })}
            progress={pct(metrics.refundedCount, Math.max(payments.length, 1))}
            barTone="bg-slate-400"
          />
        </div>
      )}

      {/* Analytical mini-row (3 cards) */}
      {!loading && !error && referencePayments.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Channel distribution */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-[18px] w-[18px] text-[#2563EB]" />
                <h3 className="text-sm font-extrabold text-[#0B1C30]">
                  {t("admin.payments.insights.channelsTitle")}
                </h3>
              </div>
              <span className="rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
                {t("admin.payments.insights.channelsSub")}
              </span>
            </div>
            {metrics.channels.length === 0 ? (
              <p className="text-xs text-[#64748B]">{t("admin.payments.insights.noChannels")}</p>
            ) : (
              <div className="space-y-3">
                {metrics.channels.map((channel, index) => (
                  <div key={channel.method}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0B1C30]">
                        {t(`admin.payments.methods.${channel.method}`, {
                          defaultValue: channel.method,
                        })}
                      </span>
                      <span className="font-bold text-[#0B1C30]">
                        {channel.pct}%{" "}
                        <span className="font-semibold text-[#565E74]">
                          ({formatLydCompact(channel.amount)} {t("admin.payments.kpis.lyd")})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
                      <div
                        className={`h-full rounded-full ${
                          index === 0 ? "bg-[#2563EB]" : index === 1 ? "bg-amber-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${Math.min(channel.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {metrics.channels.length > 0 && (
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#565E74]">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                {t("admin.payments.insights.channelsNote", {
                  count: metrics.successCount,
                })}
              </div>
            )}
          </div>

          {/* Pending escrow guard */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#EFF4FF] p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="h-[18px] w-[18px] text-[#2563EB]" />
                <h3 className="text-sm font-extrabold text-[#0B1C30]">
                  {t("admin.payments.insights.escrowTitle")}
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-[#565E74]">
                {t("admin.payments.insights.escrowBody")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
                    {t("admin.payments.insights.heldAmount")}
                  </span>
                  <span className="mt-1 block text-lg font-extrabold tracking-tight text-[#0B1C30]">
                    {formatLydCompact(metrics.escrowSum)}{" "}
                    <span className="text-xs font-bold text-[#565E74]">
                      {t("admin.payments.kpis.lyd")}
                    </span>
                  </span>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
                    {t("admin.payments.insights.oldestPending")}
                  </span>
                  <span className="mt-1 block text-sm font-extrabold text-[#0B1C30]">
                    {metrics.escrowOldest
                      ? daysAgoLabel(metrics.escrowOldest, i18n.language)
                      : t("admin.payments.insights.none")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Unsettled fleet payout summary */}
          <div className="flex flex-col justify-between rounded-2xl bg-[#0F172A] p-5 text-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-[18px] w-[18px] text-[#B4C5FF]" />
                <h3 className="text-sm font-extrabold text-white">
                  {t("admin.payments.insights.settlementTitle")}
                </h3>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-[#B4C5FF]">
                {t("admin.payments.insights.settlementSub")}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-white/70">
                  {t("admin.payments.insights.owedPartners")}
                </span>
                <span className="text-xl font-extrabold text-white">
                  {formatLydCompact(metrics.unsettledShare)}{" "}
                  <span className="text-xs font-bold text-white/60">
                    {t("admin.payments.kpis.lyd")}
                  </span>
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-white/70">
                  {t("admin.payments.insights.partners")}
                </span>
                <span className="text-sm font-bold text-[#B4C5FF]">
                  {metrics.unsettledPartners}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-white/70">
                  {t("admin.payments.insights.oldestUnsettled")}
                </span>
                <span className="text-sm font-bold text-[#B4C5FF]">
                  {metrics.unsettledOldest
                    ? daysAgoLabel(metrics.unsettledOldest, i18n.language)
                    : t("admin.payments.insights.none")}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/60">
              {t("admin.payments.insights.settlementNote")}
            </p>
          </div>
        </div>
      )}

      {/* Filters & search toolbar */}
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
              placeholder={t("admin.payments.searchPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label={t("admin.payments.filterStatus")}
              icon={<ListFilter className="h-4 w-4" />}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: t(`admin.status.${s}`),
              }))}
              allLabel={t("admin.payments.filterAll", { count: pagination.total })}
            />
            <FilterSelect
              label={t("admin.payments.filterMethod")}
              icon={<CreditCard className="h-4 w-4" />}
              value={method}
              onChange={(v) => {
                setMethod(v);
                resetPage();
              }}
              options={methods.map((m) => ({
                value: m,
                label: t(`admin.payments.methods.${m}`, { defaultValue: m }),
              }))}
              allLabel={t("admin.payments.filterAll", { count: pagination.total })}
            />
            <FilterSelect
              label={t("admin.payments.filterProvider")}
              icon={<Wallet className="h-4 w-4" />}
              value={provider}
              onChange={(v) => {
                setProvider(v);
                resetPage();
              }}
              options={companies.map((c) => ({ value: c._id, label: c.name }))}
              allLabel={t("admin.payments.filterProviderAll", { count: companies.length })}
            />
            <FilterSelect
              label={t("admin.payments.filterRange")}
              icon={<Calendar className="h-4 w-4" />}
              value={range}
              onChange={(v) => {
                setRange(v);
                resetPage();
              }}
              options={RANGE_OPTIONS.filter((r) => r !== "ALL").map((r) => ({
                value: r,
                label: t(`admin.payments.range.${r}`),
              }))}
              allLabel={t("admin.payments.range.all")}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.payments.clearFilters")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Primary register */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-[#0B1C30]">
              {t("admin.payments.table.title")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
              {t("admin.payments.table.records", { count: pagination.total })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#565E74]">
            <FileDown className="h-4 w-4 text-[#2563EB]" />
            <span>{t("admin.payments.export")}</span>
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
            <CreditCard className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("admin.bookings.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("admin.bookings.retry")}
            </button>
          </div>
        ) : (
          <AdminPaymentsTable
            payments={filtered}
            bookings={bookings}
            customers={customers}
            companies={companies}
            selectedId={selected?._id ?? ""}
            onSelect={handleSelect}
            openDossier={(p) => openDossier(p)}
            viewBooking={viewBooking}
            pagination={pagination}
            onPageChange={setPage}
            loading={pageLoading}
            emptyLabel={t("admin.payments.table.empty")}
          />
        )}
      </section>

      {/* Transaction dossier */}
      <div ref={dossierRef} className="mt-6 scroll-mt-6">
        {!loading && !error && selected ? (
          <PaymentDossierPanel
            payment={selected}
            bookings={bookings}
            customers={customers}
            companies={companies}
            onOpenBooking={viewBooking}
          />
        ) : !loading && !error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
            <Receipt className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm text-[#64748B]">{t("admin.payments.table.empty")}</p>
          </div>
        ) : null}
      </div>

      {/* Ledger integrity strip */}
      {!loading && !error && referencePayments.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] md:flex-row">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0B1C30]">
                {t("admin.payments.title")}
              </h4>
              <p className="max-w-3xl text-sm text-[#565E74]">
                {t("admin.payments.subtitle")}
              </p>
            </div>
          </div>
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

const formatLydCompact = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const daysAgoLabel = (iso: string, lang: string): string => {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000),
  );
  return `${days}d • ${formatDate(iso, lang)}`;
};

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
);

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

export default AdminPaymentsPage;