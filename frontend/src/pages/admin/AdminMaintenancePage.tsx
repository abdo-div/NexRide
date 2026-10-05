import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  ListFilter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react";
import { useAdminHub } from "../../context/adminHub";
import { useAdminMaintenance } from "../../hooks/useAdminMaintenance";
import { adminApi } from "../../lib/adminApi";
import { maintenanceCsv } from "../../lib/adminMetrics";
import { saveBlobAsFile } from "../../lib/bookingView";
import {
  categoryOptions,
  companyOf,
  eventVehicleRef,
  vehicleOf,
} from "../../lib/maintenanceView";
import { AdminMaintenanceTable } from "../../components/admin/AdminMaintenanceTable";
import { MaintenanceDossierPanel } from "../../components/admin/MaintenanceDossierPanel";
import { LogMaintenanceModal } from "../../components/admin/LogMaintenanceModal";
import type {
  CreateMaintenancePayload,
  MaintenanceDispatchStatus,
  MaintenanceEventDto,
} from "../../types/admin";

const PAGE_SIZE = 8;
const STATUS_OPTIONS: MaintenanceDispatchStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "OVERDUE",
  "COMPLETED",
];

const cityOf = (event: MaintenanceEventDto): string =>
  vehicleOf(event)?.city ?? companyOf(event)?.city ?? "";

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

export const AdminMaintenancePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hub } = useAdminHub();
  const { data, loading, error, reload } = useAdminMaintenance();
  const { events, vehicles, summary } = data;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [partner, setPartner] = useState("ALL");
  const [hubFilter, setHubFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [openModal, setOpenModal] = useState(false);
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
  // Hub-scoped events (global hub selector) → client-side filters
  // -------------------------------------------------------------------------
  const scoped = useMemo(
    () => (hub ? events.filter((e) => cityOf(e) === hub) : events),
    [events, hub],
  );

  // -------------------------------------------------------------------------
  // Server-paginated rows (search + status + category + partner + hub)
  // -------------------------------------------------------------------------
  /** The global dispatch-hub selector wins over the page-local city dropdown. */
  const effectiveHub = hub ? hub : hubFilter !== "ALL" ? hubFilter : "";

  const queryKey = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search,
      status,
      category,
      partner,
      hub: effectiveHub,
    }),
    [page, search, status, category, partner, effectiveHub],
  );

  const fetchPage = useCallback(
    async (signal: AbortSignal) => {
      const res = await adminApi.listMaintenance(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status,
          category,
          companyId: partner,
          hub: effectiveHub || undefined,
        },
        signal,
      );
      return { rows: res.data.events ?? [], pagination: res.pagination };
    },
    [page, search, status, category, partner, effectiveHub],
  );

  const {
    rows: filtered,
    pagination,
    loading,
    error,
    reload: reloadPage,
  } = usePaginatedList<MaintenanceEventDto>(fetchPage, queryKey);

  /** Refresh both the page window and the registries behind the dropdowns/KPIs. */
  const reload = useCallback(() => {
    reloadPage();
    reloadRegistry();
  }, [reloadPage, reloadRegistry]);

  const hubOptions = useMemo(() => {
    const seen = new Map<string, string>();
    scoped.forEach((e) => {
      const city = cityOf(e);
      if (city && !seen.has(city)) seen.set(city, city);
    });
    return Array.from(seen.values());
  }, [scoped]);

  const partnerOptions = useMemo(() => {
    const seen = new Map<string, { value: string; label: string }>();
    scoped.forEach((e) => {
      const company = companyOf(e);
      if (company?._id && !seen.has(company._id)) {
        seen.set(company._id, { value: company._id, label: company.name ?? company._id });
      }
    });
    return Array.from(seen.values());
  }, [scoped]);

  const selected = useMemo(() => {
    if (filtered.length === 0) return undefined;
    return filtered.find((e) => e._id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const openDossier = (event: MaintenanceEventDto) => {
    setSelectedId(event._id);
    requestAnimationFrame(() => {
      dossierRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleClear = () => {
    setSearch("");
    setStatus("ALL");
    setCategory("ALL");
    setPartner("ALL");
    setHubFilter("ALL");
    resetPage();
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([maintenanceCsv(filtered)], { type: "text/csv;charset=utf-8" }),
      `nexride-maintenance-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  // -------------------------------------------------------------------------
  // Lifecycle actions (create / complete / admin clearance release)
  // -------------------------------------------------------------------------
  const handleCreate = async (payload: CreateMaintenancePayload) => {
    setBusy(true);
    try {
      await adminApi.createMaintenanceEvent(payload);
      showToast(t("admin.maintenance.modal.success"));
      setOpenModal(false);
      reload();
    } catch {
      showToast(t("admin.maintenance.modal.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (event: MaintenanceEventDto) => {
    if (event.dispatchStatus === "COMPLETED") return;
    setBusy(true);
    try {
      await adminApi.completeMaintenanceEvent(event._id);
      showToast(t("admin.maintenance.dossier.releaseSuccess", {
        vehicle: vehicleTitleOf(event),
      }));
      reload();
    } catch {
      showToast(t("admin.maintenance.dossier.mutationError"));
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async (event: MaintenanceEventDto) => {
    const vehicle = vehicleOf(event);
    const vehicleId = vehicle?._id ?? String(event.vehicleId);
    if (!vehicleId) return;
    if (!window.confirm(t("admin.maintenance.dossier.releaseConfirmTitle"))) return;
    setBusy(true);
    try {
      await adminApi.releaseMaintenanceVehicle(vehicleId);
      showToast(
        t("admin.maintenance.dossier.releaseSuccess", {
          vehicle: vehicleTitleOf(event),
        }),
      );
      reload();
    } catch {
      showToast(t("admin.maintenance.dossier.mutationError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.maintenance.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.maintenance.grid")}
            </span>
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.maintenance.title")}
            <span className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-sm font-bold text-[#2563EB]">
              {t("admin.maintenance.subtitleChip")}
            </span>
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#565E74]">
            {t("admin.maintenance.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("admin.maintenance.liveChip")}
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.maintenance.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.maintenance.exportHealth")}
          </button>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Wrench className="h-4 w-4" />
            {t("admin.maintenance.logEvent")}
          </button>
        </div>
      </div>

      {/* Quarantine blocked pill */}
      {!loading && !error && summary && summary.quarantinedUnits > 0 && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-[#BA1A1A]">
          <ShieldAlert className="h-4 w-4" />
          {t("admin.maintenance.quarantinedUnits", {
            count: summary.quarantinedUnits,
          })}
        </div>
      )}

      {/* Fleet Health KPIs (5 cards — 4 light + 1 dark expense tile) */}
      {!loading && !error && summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label={t("admin.maintenance.kpis.inService")}
            icon={<Siren className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={formatCount(summary.inServiceVehicles)}
            suffix={t("admin.maintenance.kpis.units")}
            sub={t("admin.maintenance.kpis.inServiceSub", {
              pct: summary.inServicePct.toFixed(1),
            })}
            progress={summary.inServicePct}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.maintenance.kpis.scheduled")}
            icon={<CalendarClock className="h-[18px] w-[18px]" />}
            iconTone="bg-slate-100 text-slate-600"
            value={formatCount(summary.scheduledNext7d)}
            suffix={t("admin.maintenance.kpis.units")}
            sub={t("admin.maintenance.kpis.scheduledSub")}
            progress={100}
            barTone="bg-slate-400"
          />
          <KpiCard
            label={t("admin.maintenance.kpis.overdue")}
            icon={<ShieldAlert className="h-[18px] w-[18px]" />}
            iconTone="bg-red-100 text-[#BA1A1A]"
            value={formatCount(summary.overdueCount)}
            suffix={t("admin.maintenance.kpis.units")}
            sub={
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#BA1A1A]" />
                {t("admin.maintenance.kpis.overdueSub")}
              </span>
            }
            progress={100}
            barTone="bg-[#BA1A1A]"
            pulsingValue
          />
          <KpiCard
            label={t("admin.maintenance.kpis.unavailable")}
            icon={<Building2 className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-amber-700"
            value={formatCount(summary.unavailableFleet)}
            suffix={t("admin.maintenance.kpis.units")}
            sub={`${summary.quarantinedUnits} ${t("admin.maintenance.kpis.quarantined")}`}
            progress={100}
            barTone="bg-amber-500"
          />
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-4 text-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {t("admin.maintenance.kpis.mtd")}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Banknote className="h-[18px] w-[18px] text-emerald-300" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tracking-tight">
                {formatCount(summary.mtdCost)}
              </span>
              <span className="text-xs font-bold text-emerald-300">
                {t("admin.maintenance.kpis.lyd")}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t("admin.maintenance.kpis.mtdSub", {
                monthLabel: summary.monthLabel,
                avg: formatCount(Math.round(summary.avgCostPerVehicle)),
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fleet Health Deck */}
      {!loading && !error && summary && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="mb-3 text-sm font-extrabold text-[#0B1C30]">
            {t("admin.maintenance.health.title")}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HealthTile
              label={t("admin.maintenance.health.scheduled")}
              value={summary.scheduledNext7d}
              tone="bg-[#EFF4FF] text-[#2563EB]"
            />
            <HealthTile
              label={t("admin.maintenance.health.inProgress")}
              value={summary.inProgress}
              tone="bg-amber-50 text-amber-700"
            />
            <HealthTile
              label={t("admin.maintenance.health.completed")}
              value={summary.completed14d}
              tone="bg-emerald-50 text-emerald-700"
            />
            <HealthTile
              label={t("admin.maintenance.health.overdue")}
              value={summary.overdueCount}
              tone="bg-red-50 text-[#BA1A1A]"
              pulse
            />
          </div>
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
              placeholder={t("admin.maintenance.filters.searchPlaceholder")}
              className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label={t("admin.maintenance.filters.allStatuses")}
              icon={<ListFilter className="h-4 w-4" />}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: t(`admin.maintenance.statuses.${s}`),
              }))}
              allLabel={t("admin.maintenance.filters.allStatuses")}
            />
            <FilterSelect
              label={t("admin.maintenance.filters.allCategories")}
              icon={<Wrench className="h-4 w-4" />}
              value={category}
              onChange={(v) => {
                setCategory(v);
                resetPage();
              }}
              options={categoryOptions.map((c) => ({
                value: c,
                label: t(`admin.maintenance.categories.${c}`),
              }))}
              allLabel={t("admin.maintenance.filters.allCategories")}
            />
            <FilterSelect
              label={t("admin.maintenance.filters.allPartners")}
              icon={<Building2 className="h-4 w-4" />}
              value={partner}
              onChange={(v) => {
                setPartner(v);
                resetPage();
              }}
              options={partnerOptions}
              allLabel={t("admin.maintenance.filters.allPartners")}
            />
            <FilterSelect
              label={t("admin.maintenance.filters.allHubs")}
              icon={<Siren className="h-4 w-4" />}
              value={hubFilter}
              onChange={(v) => {
                setHubFilter(v);
                resetPage();
              }}
              options={hubOptions.map((city) => ({ value: city, label: city }))}
              allLabel={t("admin.maintenance.filters.allHubs")}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.maintenance.filters.reset")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Maintenance ledger */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-[#0B1C30]">
              {t("admin.maintenance.table.title")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
              {t("admin.maintenance.count", { count: filtered.length })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#565E74]">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            <span>{t("admin.maintenance.grid")}</span>
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
            <Wrench className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("admin.maintenance.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("admin.maintenance.retry")}
            </button>
          </div>
        ) : (
          <div className="p-6 pt-0">
            <AdminMaintenanceTable
              rows={filtered}
              selectedId={selected?._id ?? ""}
              onSelect={(event) => setSelectedId(event._id)}
              openDossier={(event) => openDossier(event)}
              completeEvent={(event) => handleComplete(event)}
              busy={busy}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              emptyLabel={t("admin.maintenance.table.empty")}
            />
          </div>
        )}
      </section>

      {/* Quarantine dossier */}
      <div ref={dossierRef} className="mt-6 scroll-mt-6">
        {!loading && !error && selected ? (
          <MaintenanceDossierPanel
            event={selected}
            busy={busy}
            onRelease={(event) => handleRelease(event)}
          />
        ) : !loading && !error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
            <ShieldAlert className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm text-[#64748B]">
              {t("admin.maintenance.table.empty")}
            </p>
          </div>
        ) : null}
      </div>

      {/* + Log Maintenance Event */}
      {openModal && (
        <LogMaintenanceModal
          vehicles={vehicles}
          busy={busy}
          onClose={() => setOpenModal(false)}
          onSubmit={(payload) => handleCreate(payload)}
        />
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

const vehicleTitleOf = (event: MaintenanceEventDto): string => {
  const vehicle = vehicleOf(event);
  return vehicle
    ? `${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.year ?? ""}`.trim()
    : eventVehicleRef(event);
};

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  icon: React.ReactNode;
  iconTone: string;
  value: string;
  suffix: string;
  sub: React.ReactNode;
  progress: number;
  barTone: string;
  pulsingValue?: boolean;
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
  pulsingValue,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-[#565E74]">{label}</span>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
    </div>
    <div className={`mt-2 flex items-baseline gap-1 ${pulsingValue ? "animate-pulse" : ""}`}>
      <span className="text-2xl font-extrabold tracking-tight text-[#0B1C30]">{value}</span>
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

interface HealthTileProps {
  label: string;
  value: number;
  tone: string;
  pulse?: boolean;
}

const HealthTile: React.FC<HealthTileProps> = ({ label, value, tone, pulse }) => (
  <div className="flex items-center justify-between rounded-xl p-3">
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">{label}</div>
      <div className={`mt-1 text-xl font-extrabold tracking-tight ${tone}`}>
        {formatCount(value)}
      </div>
    </div>
    {pulse ? (
      <span className={`h-2 w-2 animate-pulse rounded-full ${tone}`} />
    ) : (
      <CheckCircle2 className={`h-4 w-4 ${tone}`} />
    )}
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

export default AdminMaintenancePage;