import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Car,
  CheckCircle2,
  Download,
  FileDown,
  ListFilter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
  Warehouse,
  XCircle,
} from "lucide-react";
import { useAdminData } from "../../hooks/useAdminData";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { companiesCsv } from "../../lib/adminMetrics";
import { adminApi } from "../../lib/adminApi";
import { saveBlobAsFile } from "../../lib/bookingView";
import {
  bookingsOf,
  paymentsOf,
  vehiclesOf,
} from "../../lib/companyView";
import { initialsFrom } from "../../lib/vehicleMapper";
import { StatusPill } from "../../components/admin/StatusPill";
import { AdminCompaniesTable } from "../../components/admin/AdminCompaniesTable";
import {
  CompanyDossierPanel,
  type CompanyTab,
} from "../../components/admin/CompanyDossierPanel";
import type {
  AdminCompanyDto,
  CompanyStatus,
} from "../../types/admin";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: CompanyStatus[] = [
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
];

/** Completed-payment gross within the trailing [days, 0) window. */
const grossSince = (payments: ReturnType<typeof paymentsOf>, days: number): number => {
  const from = Date.now() - days * 86400000;
  return payments
    .filter((p) => p.status === "COMPLETED")
    .filter(
      (p) => new Date(p.paidAt ?? p.createdAt ?? 0).getTime() >= from,
    )
    .reduce((sum, p) => sum + p.amount, 0);
};

/** Completed-payment gross within the window [untilDays, sinceDays). */
const grossBetween = (
  payments: ReturnType<typeof paymentsOf>,
  sinceDays: number,
  untilDays: number,
): number => {
  const since = Date.now() - sinceDays * 86400000;
  const until = Date.now() - untilDays * 86400000;
  return payments
    .filter((p) => p.status === "COMPLETED")
    .filter((p) => {
      const at = new Date(p.paidAt ?? p.createdAt ?? 0).getTime();
      return at >= until && at < since;
    })
    .reduce((sum, p) => sum + p.amount, 0);
};

const vehiclesSince = (
  vehicles: ReturnType<typeof vehiclesOf>,
  days: number,
): number => {
  const from = Date.now() - days * 86400000;
  return vehicles.filter((v) => new Date(v.createdAt ?? 0).getTime() >= from)
    .length;
};

/** Operator data richness scoring (module scope for useMemo deps). */
const richnessOf = (
  _company: AdminCompanyDto,
  vehicles: ReturnType<typeof vehiclesOf>,
  bookings: ReturnType<typeof bookingsOf>,
  payments: ReturnType<typeof paymentsOf>,
): number => bookings.length + vehicles.length + payments.length;

export const AdminCompaniesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // KPI/dossier sections read the bounded registries, so they follow the
  // registry's own load state rather than the table's page state.
  const {
    data,
    loading: registryLoading,
    error: registryError,
    reload: reloadRegistry,
  } = useAdminData();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [hubFilter, setHubFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState(false);
  const dossierRef = useRef<HTMLDivElement>(null);

  const { companies, vehicles, bookings, payments } = data;

  const resetPage = () => setPage(1);

  const hubOptions = useMemo(
    () =>
      Array.from(new Set(companies.map((c) => c.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, i18n.language),
      ),
    [companies, i18n.language],
  );

  // -------------------------------------------------------------------------
  // Registry KPIs (respect the hub selector; reflect real backend datasets)
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const approved = companies.filter((c) => c.status === "APPROVED").length;
    const pending = companies.filter((c) => c.status === "PENDING").length;
    const suspended = companies.filter((c) => c.status === "SUSPENDED").length;
    const rejected = companies.filter((c) => c.status === "REJECTED").length;

    const completed = payments.filter((p) => p.status === "COMPLETED");
    const gross = completed.reduce((sum, p) => sum + p.amount, 0);
    const commission = completed.reduce(
      (sum, p) => sum + p.commissionAmount,
      0,
    );
    const unsettled = payments
      .filter((p) => p.payoutStatus === "UNSETTLED")
      .reduce((sum, p) => sum + p.companyShare, 0);
    const unsettledCount = payments.filter(
      (p) => p.payoutStatus === "UNSETTLED",
    ).length;

    const currentGross = grossSince(payments, 30);
    const priorGross = grossBetween(payments, 60, 30);
    const delta =
      priorGross > 0
        ? Math.round(((currentGross - priorGross) / priorGross) * 100)
        : null;

    const monthVehicles = vehiclesSince(vehicles, 30);

    return {
      total: companies.length,
      approved,
      pending,
      suspended,
      rejected,
      fleet: vehicles.length,
      monthVehicles,
      gross,
      commission,
      unsettled,
      unsettledCount,
      delta,
    };
  }, [companies, payments, vehicles]);

  // -------------------------------------------------------------------------
  // Server-paginated rows (search + status + city), newest first
  // -------------------------------------------------------------------------
  const queryKey = useMemo(
    () => ({ page, limit: PAGE_SIZE, search, status, hubFilter }),
    [page, search, status, hubFilter],
  );

  const fetchPage = useCallback(
    async (signal: AbortSignal) => {
      const res = await adminApi.listCompanies(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status,
          city: hubFilter === "ALL" ? undefined : hubFilter,
        },
        signal,
      );
      return { rows: res.data.companies ?? [], pagination: res.pagination };
    },
    [page, search, status, hubFilter],
  );

  const {
    rows: filtered,
    pagination,
    loading,
    error,
    reload: reloadPage,
  } = usePaginatedList<AdminCompanyDto>(fetchPage, queryKey);

  /** Refresh both the page window and the bounded registries behind the KPIs. */
  const reload = useCallback(() => {
    reloadPage();
    reloadRegistry();
  }, [reloadPage, reloadRegistry]);

  // -------------------------------------------------------------------------
  // Selected operator: remember the clicked row, otherwise use the richest
  // partner on the page (most registrations) rather than the first row.
  // -------------------------------------------------------------------------
  const selected = useMemo(() => {
    if (filtered.length === 0) return undefined;
    const hit = filtered.find((c) => c._id === selectedId);
    if (hit) return hit;
    return [...filtered].sort(
      (a, b) =>
        richnessOf(b, vehiclesOf(vehicles, b), bookingsOf(bookings, b), paymentsOf(payments, b)) -
        richnessOf(a, vehiclesOf(vehicles, a), bookingsOf(bookings, a), paymentsOf(payments, a)) ||
        new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
    )[0];
  }, [filtered, selectedId, vehicles, bookings, payments]);

  const pendingStack = useMemo(
    () =>
      companies
        .filter((c) => c.status === "PENDING")
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 2),
    [companies],
  );

  // -------------------------------------------------------------------------
  // Real governance mutations (PATCH /admin/companies/:id/status)
  // -------------------------------------------------------------------------
  const applyStatus = async (company: AdminCompanyDto, next: CompanyStatus) => {
    setMutationError(false);
    setMutatingId(company._id);
    try {
      await adminApi.updateCompanyStatus(company._id, next);
      reload();
    } catch {
      setMutationError(true);
    } finally {
      setMutatingId(null);
    }
  };

  const handleSelect = (company: AdminCompanyDto) => {
    setSelectedId(company._id);
  };

  const openDossier = (company: AdminCompanyDto, tab?: CompanyTab) => {
    setSelectedId(company._id);
    void tab;
    requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleViewBooking = (bookingId: string) =>
    navigate(`/admin/bookings/${bookingId}`);

  /** Exports the rows the operator is currently looking at. */
  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([companiesCsv(filtered, vehicles)], {
        type: "text/csv;charset=utf-8",
      }),
      `nexride-admin-companies-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleClear = () => {
    setSearch("");
    setStatus("ALL");
    setHubFilter("ALL");
    resetPage();
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.companies.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.companies.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.companies.title")}
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-[#565E74]">
            {t("admin.companies.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.companies.count", { count: pagination.total })}
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.companies.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.companies.export")}
          </button>
        </div>
      </div>

      {/* Pending approval banner (top-2 newest pending operators) */}
      {!registryLoading && !registryError && pendingStack.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#FEF6E7] to-[#FDF1F3] p-6 shadow-[0_4px_20px_-2px_rgba(180,83,9,0.08)] ring-1 ring-[#FCD9A0]/40">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-[#B45309]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
                  {t("admin.companies.alert.title")}
                </h2>
                <span className="rounded-full bg-[#FFFFFF]/80 px-2.5 py-0.5 text-[11px] font-bold text-[#B45309] ring-1 ring-[#FCD9A0]/50">
                  {t("admin.companies.alert.requiringAction", {
                    count: companies.filter((c) => c.status === "PENDING").length,
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#7A5A22]">
                {t("admin.companies.alert.body")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pendingStack.map((c) => {
              const fleet = vehiclesOf(vehicles, c);
              const busy = mutatingId === c._id;
              return (
                <div
                  key={c._id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[#FCD9A0]/50 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF1D8] text-sm font-bold text-[#B45309]">
                      {initialsFrom(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#0B1C30]">
                        {c.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#565E74]">
                        <StatusPill status="PENDING" kind="company" />
                        <span className="truncate">
                          {t("admin.companies.alert.submittedVehicles", {
                            count: fleet.length,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus(c, "REJECTED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {t("admin.companies.alert.reject")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDossier(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer"
                    >
                      {t("admin.companies.alert.review")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus(c, "APPROVED")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(5,150,105,0.25)] transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {t("admin.companies.alert.approve")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI bento (5 cards) */}
      {!registryLoading && !registryError && companies.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label={t("admin.companies.kpis.registered")}
            icon={<Building2 className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={String(kpis.total)}
            suffix={t("admin.companies.kpis.partners")}
            sub={
              <>
                <span className="font-bold text-emerald-700">
                  {t("admin.companies.kpis.approvedCount", { count: kpis.approved })}
                </span>
                <span> • </span>
                <span className="font-semibold text-[#B45309]">
                  {t("admin.companies.kpis.pendingCount", { count: kpis.pending })}
                </span>
                {kpis.suspended > 0 && (
                  <>
                    <span> • </span>
                    <span className="font-semibold text-[#BA1A1A]">
                      {t("admin.companies.kpis.suspendedCount", { count: kpis.suspended })}
                    </span>
                  </>
                )}
                {kpis.rejected > 0 && (
                  <>
                    <span> • </span>
                    <span className="font-semibold text-[#565E74]">
                      {t("admin.companies.kpis.rejectedCount", { count: kpis.rejected })}
                    </span>
                  </>
                )}
              </>
            }
            progress={pct(kpis.approved, kpis.total)}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.companies.kpis.fleet")}
            icon={<Warehouse className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={String(kpis.fleet)}
            suffix={t("admin.companies.kpis.vehicles")}
            sub={
              kpis.monthVehicles > 0
                ? t("admin.companies.kpis.addedThisMonth", { count: kpis.monthVehicles })
                : t("admin.companies.kpis.addedThisMonthNone")
            }
            progress={pct(Math.min(kpis.fleet, 12), 12)}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.companies.kpis.dispatches")}
            icon={<Banknote className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={formatLyd(kpis.gross)}
            suffix={t("admin.companies.kpis.lyd")}
            sub={
              kpis.delta !== null ? (
                <>
                  <span
                    className={`font-bold ${kpis.delta >= 0 ? "text-emerald-700" : "text-[#BA1A1A]"}`}
                  >
                    {t("admin.companies.kpis.delta", { pct: kpis.delta })}
                  </span>
                  <span> • </span>
                  <span>{t("admin.companies.kpis.vsLastMonth")}</span>
                </>
              ) : (
                t("admin.companies.kpis.vsLastMonthNone")
              )
            }
            progress={pct(kpis.gross, Math.max(kpis.gross + kpis.commission, 1))}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.companies.kpis.commission")}
            icon={<ShieldCheck className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={formatLyd(kpis.commission)}
            suffix={t("admin.companies.kpis.lyd")}
            sub={t("admin.companies.kpis.commissionSub")}
            progress={pct(kpis.commission, Math.max(kpis.gross, 1))}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.companies.kpis.escrow")}
            icon={<Wallet className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-[#B45309]"
            value={formatLyd(kpis.unsettled)}
            suffix={t("admin.companies.kpis.lyd")}
            sub={
              kpis.unsettledCount > 0
                ? t("admin.companies.kpis.escrowSub", { count: kpis.unsettledCount })
                : t("admin.companies.kpis.escrowSubNone")
            }
            progress={pct(kpis.unsettled, Math.max(kpis.unsettled, 1))}
            barTone="bg-amber-500"
          />
        </div>
      )}

      {/* Search + status + hub filter ribbon */}
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
              placeholder={t("admin.companies.searchPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label={t("admin.companies.filterStatus")}
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
              allLabel={t("admin.companies.filterStatusAll", {
                count: pagination.total,
              })}
            />
            <FilterSelect
              label={t("admin.companies.filterHub")}
              icon={<MapPin className="h-4 w-4" />}
              value={hubFilter}
              onChange={(v) => {
                setHubFilter(v);
                resetPage();
              }}
              options={hubOptions.map((city) => ({ value: city, label: city }))}
              allLabel={t("admin.companies.filterHubAll")}
            />
            <div className="flex items-end sm:col-span-2 xl:col-span-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.companies.clearFilters")}
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
              {t("admin.companies.table.title")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
              {t("admin.companies.table.records", {
                count: pagination.total,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#565E74]">
            <FileDown className="h-4 w-4 text-[#2563EB]" />
            <span>{t("admin.companies.export")}</span>
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
            <Car className="h-10 w-10 text-[#94A3B8]" />
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
          <AdminCompaniesTable
            companies={filtered}
            vehicles={vehicles}
            bookings={bookings}
            payments={payments}
            selectedId={selected?._id ?? ""}
            onSelect={handleSelect}
            openDossier={(c) => openDossier(c)}
            pagination={pagination}
            onPageChange={setPage}
            emptyLabel={t("admin.companies.table.empty")}
            loading={loading}
          />
        )}
      </section>

      {/* Inline operator dossier */}
      <div ref={dossierRef} className="mt-6 scroll-mt-6">
        {!loading && !error && selected ? (
          <CompanyDossierPanel
            company={selected}
            vehicles={vehicles}
            bookings={bookings}
            payments={payments}
            onViewBooking={handleViewBooking}
            mutating={mutatingId === selected._id}
            mutationError={mutationError}
            onApprove={() => void applyStatus(selected, "APPROVED")}
            onReject={() => void applyStatus(selected, "REJECTED")}
            onSuspend={() => void applyStatus(selected, "SUSPENDED")}
            onReactivate={() => void applyStatus(selected, "APPROVED")}
          />
        ) : !loading && !error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
            <Car className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm text-[#64748B]">
              {t("admin.companies.table.empty")}
            </p>
          </div>
        ) : null}
      </div>

      {/* Compliance strip */}
      {!registryLoading && !registryError && companies.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] md:flex-row">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0B1C30]">
                {t("admin.companies.command")}
              </h4>
              <p className="max-w-3xl text-sm text-[#565E74]">
                {t("admin.companies.subtitle")}
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

const formatLyd = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

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

export default AdminCompaniesPage;