import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarDays,
  Download,
  FileDown,
  ListFilter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useAdminCustomers } from "../../hooks/useAdminCustomers";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { customersCsv } from "../../lib/adminMetrics";
import { adminApi } from "../../lib/adminApi";
import { saveBlobAsFile } from "../../lib/bookingView";
import {
  bookingsOfCustomer,
  completedPaymentsOfCustomer,
  spendOfCustomer,
} from "../../lib/customerView";
import { AdminCustomersTable } from "../../components/admin/AdminCustomersTable";
import { CustomerDossierPanel } from "../../components/admin/CustomerDossierPanel";
import type { AdminCustomerDto, UserStatus } from "../../types/admin";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: UserStatus[] = ["ACTIVE", "SUSPENDED", "BANNED"];

export const AdminCustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data,
    loading: registryLoading,
    error: registryError,
    reload: reloadRegistry,
  } = useAdminCustomers();
  const { customers: referenceCustomers, bookings, vehicles, payments } = data;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState(false);
  const dossierRef = useRef<HTMLDivElement>(null);

  const queryKey = useMemo(
    () => ({ page, limit: PAGE_SIZE, search, status }),
    [page, search, status],
  );
  const fetchPage = useCallback(
    async (signal: AbortSignal) => {
      const res = await adminApi.listCustomers(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status,
        },
        signal,
      );
      return { rows: res.data.users ?? [], pagination: res.pagination };
    },
    [page, search, status],
  );
  const {
    rows: customers,
    pagination,
    loading: pageLoading,
    error: pageError,
    reload: reloadPage,
  } = usePaginatedList<AdminCustomerDto>(fetchPage, queryKey);
  const loading = registryLoading || pageLoading;
  const error = registryError || pageError;
  const reload = useCallback(() => {
    reloadRegistry();
    reloadPage();
  }, [reloadRegistry, reloadPage]);

  const resetPage = () => setPage(1);

  // -------------------------------------------------------------------------
  // Registry KPIs (real backend datasets only)
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const activeAccounts = referenceCustomers.filter((c) => (c.status ?? "ACTIVE") === "ACTIVE").length;
    const restricted = referenceCustomers.filter(
      (c) => c.status === "SUSPENDED" || c.status === "BANNED",
    ).length;
    const neverRented = referenceCustomers.filter(
      (c) => bookingsOfCustomer(bookings, c).length === 0,
    ).length;
    const activeRentals = bookings.filter((b) => b.bookingStatus === "ACTIVE").length;
    const occupancy =
      vehicles.length > 0 ? Math.round((activeRentals / vehicles.length) * 100) : 0;

    const totalSpend = referenceCustomers.reduce(
      (sum, c) => sum + spendOfCustomer(payments, c),
      0,
    );
    const renters = referenceCustomers.filter(
      (c) => bookingsOfCustomer(bookings, c).length > 0,
    ).length;
    const avgSpend = renters > 0 ? totalSpend / renters : 0;

    let topSpend = 0;
    let topName = "";
    referenceCustomers.forEach((c) => {
      const spend = spendOfCustomer(payments, c);
      if (spend > topSpend) {
        topSpend = spend;
        topName = c.name;
      }
    });

    // Completed-payment delta vs previous 30-day cycle (real ledger).
    const currentGross = grossSince(referenceCustomers, payments, 30);
    const priorGross = grossBetween(referenceCustomers, payments, 60, 30);
    const delta =
      priorGross > 0 ? Math.round(((currentGross - priorGross) / priorGross) * 100) : null;

    return {
      total: data.customerTotal,
      activeAccounts,
      restricted,
      neverRented,
      activeRentals,
      occupancy,
      avgSpend,
      topSpend,
      topCustomerName: topName,
      delta,
    };
  }, [data.customerTotal, referenceCustomers, bookings, vehicles, payments]);

  const filtered = customers;

  // -------------------------------------------------------------------------
  // Selected customer: remembered selection, else the most active on the page.
  // -------------------------------------------------------------------------
  const selected = useMemo(() => {
    if (filtered.length === 0) return undefined;
    const hit = filtered.find((c) => c._id === selectedId);
    if (hit) return hit;
    return [...filtered].sort(
      (a, b) =>
        richnessOf(b, bookings, payments) - richnessOf(a, bookings, payments) ||
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )[0];
  }, [filtered, selectedId, bookings, payments]);

  // -------------------------------------------------------------------------
  // Real accountability mutations (PATCH /api/v1/users/:id/status)
  // -------------------------------------------------------------------------
  const applyStatus = async (customer: AdminCustomerDto, next: UserStatus) => {
    setMutationError(false);
    setMutatingId(customer._id);
    try {
      await adminApi.updateUserStatus(customer._id, next);
      reload();
    } catch {
      setMutationError(true);
    } finally {
      setMutatingId(null);
    }
  };

  const handleSelect = (customer: AdminCustomerDto) => {
    setSelectedId(customer._id);
  };

  const openDossier = (customer: AdminCustomerDto) => {
    setSelectedId(customer._id);
    requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleViewBooking = (bookingId: string) =>
    navigate(`/admin/bookings/${bookingId}`);

  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([customersCsv(filtered, bookings, payments)], {
        type: "text/csv;charset=utf-8",
      }),
      `nexride-admin-customers-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleClear = () => {
    setSearch("");
    setStatus("ALL");
    resetPage();
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.customers.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.customers.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.customers.title")}
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-[#565E74]">
            {t("admin.customers.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.customers.count", { count: pagination.total })}
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.customers.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.customers.export")}
          </button>
        </div>
      </div>

      {/* KPI bento (4 cards) */}
      {!loading && !error && customers.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("admin.customers.kpis.registered")}
            icon={<Users className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={String(kpis.total)}
            suffix={t("admin.customers.kpis.registeredSub", { count: kpis.total })}
            sub={
              <>
                <span className="font-bold text-emerald-700">
                  {t("admin.customers.kpis.activeCount", { count: kpis.activeAccounts })}
                </span>
                <span> • </span>
                <span className="font-semibold text-[#565E74]">
                  {t("admin.customers.kpis.awaitingCount", { count: kpis.neverRented })}
                </span>
                {kpis.restricted > 0 && (
                  <>
                    <span> • </span>
                    <span className="font-semibold text-[#BA1A1A]">
                      {t("admin.customers.kpis.restrictedCount", { count: kpis.restricted })}
                    </span>
                  </>
                )}
              </>
            }
            progress={pct(kpis.activeAccounts, kpis.total)}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.customers.kpis.activeRentals")}
            icon={<CalendarDays className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={String(kpis.activeRentals)}
            suffix={t("admin.customers.kpis.rentingNow", { count: kpis.activeRentals })}
            sub={t("admin.customers.kpis.occupancy", { pct: kpis.occupancy })}
            progress={kpis.occupancy}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.customers.kpis.avgSpend")}
            icon={<Banknote className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={formatLyd(kpis.avgSpend)}
            suffix={t("admin.customers.kpis.lyd")}
            sub={
              kpis.topSpend > 0 ? (
                t("admin.customers.kpis.topCustomer", {
                  name: kpis.topCustomerName,
                  amount: formatLyd(kpis.topSpend),
                })
              ) : (
                t("admin.customers.kpis.topNone")
              )
            }
            progress={pct(kpis.topSpend, Math.max(kpis.topSpend, 1))}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.customers.kpis.restricted")}
            icon={<ShieldCheck className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-[#B45309]"
            value={String(kpis.restricted)}
            suffix={t("admin.customers.kpis.restrictedSub")}
            sub={
              kpis.delta !== null ? (
                <>
                  <span className={`font-bold ${kpis.delta >= 0 ? "text-emerald-700" : "text-[#BA1A1A]"}`}>
                    {t("admin.companies.kpis.delta", { pct: kpis.delta })}
                  </span>
                  <span> • </span>
                  <span>{t("admin.companies.kpis.vsLastMonth")}</span>
                </>
              ) : (
                t("admin.customers.kpis.restrictedNone")
              )
            }
            progress={pct(kpis.restricted, Math.max(kpis.total, 1))}
            barTone="bg-amber-500"
          />
        </div>
      )}

      {/* Search + status filter ribbon */}
      {!loading && !error && (
        <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <div className="relative min-w-[280px] flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#565E74]">
              <Search className="h-[18px] w-[18px]" />
            </div>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder={t("admin.customers.searchPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label={t("admin.customers.filterStatus")}
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
              allLabel={t("admin.customers.filterStatusAll", { count: data.customerTotal })}
            />
            <div className="flex items-end sm:col-span-1 xl:col-span-3">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.customers.clearFilters")}
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
              {t("admin.customers.table.title")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
              {t("admin.customers.table.records", { count: pagination.total })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#565E74]">
            <FileDown className="h-4 w-4 text-[#2563EB]" />
            <span>{t("admin.customers.export")}</span>
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
            <UserRound className="h-10 w-10 text-[#94A3B8]" />
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
          <AdminCustomersTable
            customers={filtered}
            bookings={bookings}
            payments={payments}
            selectedId={selected?._id ?? ""}
            onSelect={handleSelect}
            openDossier={(c) => openDossier(c)}
            pagination={pagination}
            onPageChange={setPage}
            loading={pageLoading}
            emptyLabel={t("admin.customers.table.empty")}
          />
        )}
      </section>

      {/* Inline customer dossier */}
      <div ref={dossierRef} className="mt-6 scroll-mt-6">
        {!loading && !error && selected ? (
          <CustomerDossierPanel
            customer={selected}
            bookings={bookings}
            payments={payments}
            onViewBooking={handleViewBooking}
            mutating={mutatingId === selected._id}
            mutationError={mutationError}
            onSuspend={() => void applyStatus(selected, "SUSPENDED")}
            onReactivate={() => void applyStatus(selected, "ACTIVE")}
            onBan={() => void applyStatus(selected, "BANNED")}
          />
        ) : !loading && !error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
            <Users className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm text-[#64748B]">
              {t("admin.customers.table.empty")}
            </p>
          </div>
        ) : null}
      </div>

      {/* Compliance strip */}
      {!loading && !error && customers.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] md:flex-row">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0B1C30]">
                {t("admin.customers.command")}
              </h4>
              <p className="max-w-3xl text-sm text-[#565E74]">
                {t("admin.customers.subtitle")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Small presentational pieces
// -----------------------------------------------------------------------------

const pct = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/** Completed-payment gross across customers within the trailing [days, 0) window. */
const grossSince = (
  customers: AdminCustomerDto[],
  payments: import("../../types/admin").AdminPaymentDto[],
  days: number,
): number => {
  const from = Date.now() - days * 86400000;
  return customers.reduce((sum, c) => {
    const windowPayments = completedPaymentsOfCustomer(payments, c).filter(
      (p) => new Date(p.paidAt ?? p.createdAt ?? 0).getTime() >= from,
    );
    return sum + windowPayments.reduce((s, p) => s + p.amount, 0);
  }, 0);
};

/** Completed-payment gross within the window [untilDays, sinceDays). */
const grossBetween = (
  customers: AdminCustomerDto[],
  payments: import("../../types/admin").AdminPaymentDto[],
  sinceDays: number,
  untilDays: number,
): number => {
  const since = Date.now() - sinceDays * 86400000;
  const until = Date.now() - untilDays * 86400000;
  return customers.reduce((sum, c) => {
    const windowPayments = completedPaymentsOfCustomer(payments, c).filter((p) => {
      const at = new Date(p.paidAt ?? p.createdAt ?? 0).getTime();
      return at >= until && at < since;
    });
    return sum + windowPayments.reduce((s, p) => s + p.amount, 0);
  }, 0);
};

const formatLyd = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const richnessOf = (
  customer: AdminCustomerDto,
  bookings: import("../../types/booking").BookingDto[],
  payments: import("../../types/admin").AdminPaymentDto[],
): number =>
  bookingsOfCustomer(bookings, customer).length +
  (spendOfCustomer(payments, customer) > 0 ? 1 : 0);

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

export default AdminCustomersPage;