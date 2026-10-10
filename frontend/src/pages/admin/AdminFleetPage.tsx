import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Armchair,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Car,
  Download,
  FileDown,
  FolderOpen,
  Fuel,
  Gauge,
  KeyRound,
  ListFilter,
  ListOrdered,
  MapPin,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Warehouse,
  Wrench,
} from "lucide-react";
import { useAdminData } from "../../hooks/useAdminData";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { adminApi } from "../../lib/adminApi";
import { filterByHub, fleetCsv } from "../../lib/adminMetrics";
import { useAdminHub } from "../../context/adminHub";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
  saveBlobAsFile,
} from "../../lib/bookingView";
import {
  bookingsFor,
  companyOf,
  customerName,
  earnedFor,
  latestBooking,
  fleetRef,
  stagingBooking,
  vehicleFullTitle,
  RESERVED_BOOKING_STATUSES,
} from "../../lib/fleetView";
import { initialsFrom, photoUrl } from "../../lib/vehicleMapper";
import { StatusPill } from "../../components/admin/StatusPill";
import { AdminFleetTable } from "../../components/admin/AdminFleetTable";
import type { BookingDto } from "../../types/booking";
import type { VehicleDto } from "../../types/vehicle";

const PAGE_SIZE = 20;

type Segment = "ALL" | "AVAILABLE" | "MAINTENANCE" | "SUSPENDED";
type SortKey = "created" | "priceLow" | "priceHigh" | "name";

/** Client sort chips translated into the endpoint's `sort` contract. */
const FLEET_SORTS: Record<SortKey, string> = {
  created: "-createdAt",
  priceLow: "dailyPrice",
  priceHigh: "-dailyPrice",
  name: "make model",
};

const markedReserved = (b: BookingDto): boolean =>
  (RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus);

const vehicleHoldsBooking = (
  booking: BookingDto,
  vehicleId: string,
): boolean =>
  typeof booking.vehicleId === "object"
    ? booking.vehicleId._id === vehicleId
    : booking.vehicleId === vehicleId;

export const AdminFleetPage: React.FC = () => {
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
  const { hub } = useAdminHub();

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("ALL");
  const [company, setCompany] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [classType, setClassType] = useState("ALL");
  const [hubFilter, setHubFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");

  const { fleetVehicles, fleetBookings, companies } = useMemo(() => {
    const filtered = filterByHub(data, hub);
    return {
      fleetVehicles: filtered.vehicles,
      fleetBookings: filtered.bookings,
      companies: filtered.companies,
    };
  }, [data, hub]);

  const resetPage = () => setPage(1);

  // -------------------------------------------------------------------------
  // Fleet-wide KPIs (respect the hub selector, not the page filters)
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = fleetVehicles.length;
    const available = fleetVehicles.filter(
      (v) => v.operationalStatus === "AVAILABLE" && v.listingStatus === "PUBLISHED",
    ).length;
    const maintenance = fleetVehicles.filter(
      (v) => v.operationalStatus === "MAINTENANCE",
    ).length;
    const unavailable = fleetVehicles.filter(
      (v) => v.operationalStatus === "SUSPENDED",
    ).length;
    const reserved = fleetVehicles.filter((v) =>
      fleetBookings.some(
        (b) => markedReserved(b) && vehicleHoldsBooking(b, v._id),
      ),
    ).length;
    const published = fleetVehicles.filter(
      (v) => v.listingStatus === "PUBLISHED",
    ).length;
    const drafts = fleetVehicles.filter((v) => v.listingStatus === "DRAFT").length;
    const suspended = fleetVehicles.filter(
      (v) => v.listingStatus === "SUSPENDED",
    ).length;

    const byCity = new Map<string, number>();
    fleetVehicles
      .filter((v) => v.operationalStatus === "AVAILABLE")
      .forEach((v) => byCity.set(v.city, (byCity.get(v.city) ?? 0) + 1));
    const topHub = Array.from(byCity.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      available,
      maintenance,
      unavailable,
      reserved,
      utilization: total > 0 ? Math.round((reserved / total) * 100) : 0,
      published,
      drafts,
      suspended,
      topHubCity: topHub?.[0] ?? "",
      topHubCount: topHub?.[1] ?? 0,
    };
  }, [fleetVehicles, fleetBookings]);

  // -------------------------------------------------------------------------
  // Segment counts + per-filter options (from the hub-filtered fleet)
  // -------------------------------------------------------------------------
  const segmentCounts = useMemo(
    () => ({
      ALL: fleetVehicles.length,
      AVAILABLE: fleetVehicles.filter(
        (v) => v.operationalStatus === "AVAILABLE",
      ).length,
      MAINTENANCE: fleetVehicles.filter(
        (v) => v.operationalStatus === "MAINTENANCE",
      ).length,
      SUSPENDED: fleetVehicles.filter(
        (v) => v.operationalStatus === "SUSPENDED",
      ).length,
    }),
    [fleetVehicles],
  );

  /**
   * Company options are keyed by id because the fleet endpoint filters on
   * `companyId`; the registry supplies the labels so the dropdown stays
   * complete while the table itself pages through the server.
   */
  const companyOptions = useMemo(
    () =>
      companies
        .filter((c) => Boolean(c.name))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
    [companies, i18n.language],
  );

  const classOptions = useMemo(
    () =>
      Array.from(new Set(fleetVehicles.map((v) => v.type))).sort((a, b) =>
        a.localeCompare(b, i18n.language),
      ),
    [fleetVehicles, i18n.language],
  );

  const hubOptions = useMemo(
    () =>
      Array.from(new Set(fleetVehicles.map((v) => v.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, i18n.language),
      ),
    [fleetVehicles, i18n.language],
  );

  // -------------------------------------------------------------------------
  // Server-paginated + server-sorted rows (search, segments, dropdowns)
  // -------------------------------------------------------------------------
  const sortParam = FLEET_SORTS[sortKey];

  /**
   * The local city dropdown wins over the global dispatch-hub selector; both used
   * to be applied together, which meant a non-matching pair simply produced an
   * empty table. The endpoint filters on the vehicle's own `city`.
   */
  const cityParam = hubFilter === "ALL" ? hub : hubFilter;

  const queryKey = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search,
      segment,
      status,
      city: cityParam,
      classType,
      company,
      sort: sortParam,
    }),
    [
      page,
      search,
      segment,
      status,
      cityParam,
      classType,
      company,
      sortParam,
    ],
  );

  const fetchPage = useCallback(
    async (signal: AbortSignal) => {
      const res = await adminApi.listVehicles(
        {
          page,
          limit: PAGE_SIZE,
          sort: sortParam,
          search: search.trim() || undefined,
          // The segment chips and the status dropdown both narrow the same
          // operational status, so they collapse into one server-side filter.
          operationalStatus: segment !== "ALL" ? segment : status,
          city: cityParam || undefined,
          type: classType === "ALL" ? undefined : classType,
          companyId: company === "ALL" ? undefined : company,
        },
        signal,
      );
      return { rows: res.data.vehicles ?? [], pagination: res.pagination };
    },
    [
      page,
      search,
      segment,
      status,
      cityParam,
      classType,
      company,
      sortParam,
    ],
  );

  const {
    rows: filtered,
    pagination,
    loading,
    error,
    reload: reloadPage,
  } = usePaginatedList<VehicleDto>(fetchPage, queryKey);

  /** Refresh both the page window and the bounded registries behind the KPIs. */
  const reload = useCallback(() => {
    reloadPage();
    reloadRegistry();
  }, [reloadPage, reloadRegistry]);

  const selected: VehicleDto | undefined =
    filtered.find((v) => v._id === selectedId) ?? filtered[0];

  const handleSelect = (v: VehicleDto) => setSelectedId(v._id);
  const handleViewBooking = (bookingId: string) =>
    navigate(`/admin/bookings/${bookingId}`);

  const handleExport = () => {
    if (filtered.length === 0) return;
    saveBlobAsFile(
      new Blob([fleetCsv(filtered)], { type: "text/csv;charset=utf-8" }),
      `nexride-admin-fleet-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleClear = () => {
    setSegment("ALL");
    setStatus("ALL");
    setCompany("ALL");
    setClassType("ALL");
    setHubFilter("ALL");
    setSearch("");
    setSortKey("created");
    resetPage();
  };

  const openDossier = (v: VehicleDto) => {
    const latest = latestBooking(fleetBookings, v);
    navigate(latest ? `/admin/bookings/${latest._id}` : "/admin/bookings");
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.fleet.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.fleet.grid")}
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.fleet.title")}
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-[#565E74]">
            {t("admin.fleet.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.fleet.count", { count: pagination.total })}
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            {t("admin.fleet.refresh")}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {t("admin.fleet.export")}
          </button>
        </div>
      </div>

      {/* KPI bento (5 cards) */}
      {!registryLoading && !registryError && fleetVehicles.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label={t("admin.fleet.kpis.totalFleet")}
            icon={<Warehouse className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={String(kpis.total)}
            suffix={t("admin.fleet.kpis.vehicles")}
            sub={
              <>
                <span className="font-bold text-emerald-700">
                  {t("admin.fleet.kpis.availableActive", { count: kpis.available })}
                </span>
                <span> • </span>
                <span>{t("admin.fleet.kpis.unavailableCount", { count: kpis.unavailable })}</span>
              </>
            }
            progress={pct(kpis.available + kpis.maintenance, kpis.total)}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.fleet.kpis.activeRentals")}
            icon={<KeyRound className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={String(kpis.reserved)}
            suffix={t("admin.fleet.kpis.active")}
            sub={t("admin.fleet.kpis.utilization", { pct: kpis.utilization })}
            progress={kpis.utilization}
            barTone="bg-emerald-500"
          />
          <KpiCard
            label={t("admin.fleet.kpis.readyDepots")}
            icon={<CalendarCheck className="h-[18px] w-[18px]" />}
            iconTone="bg-[#E5EEFF] text-[#2563EB]"
            value={String(kpis.available)}
            suffix={t("admin.fleet.kpis.available")}
            sub={
              kpis.topHubCount > 0
                ? t("admin.fleet.kpis.atHub", {
                    count: kpis.topHubCount,
                    hub: kpis.topHubCity,
                  })
                : "—"
            }
            progress={pct(kpis.available, kpis.total)}
            barTone="bg-[#2563EB]"
          />
          <KpiCard
            label={t("admin.fleet.kpis.maintenance")}
            icon={<Wrench className="h-[18px] w-[18px]" />}
            iconTone="bg-amber-50 text-[#B54E00]"
            value={String(kpis.maintenance)}
            suffix={t("admin.fleet.kpis.inService")}
            sub={
              <>
                <span className="font-semibold text-[#8E3C00]">
                  {t("admin.fleet.kpis.scheduled", { count: kpis.maintenance })}
                </span>
                <span> • </span>
                <span className="font-semibold text-[#BA1A1A]">
                  {t("admin.fleet.kpis.grounded", { count: kpis.unavailable })}
                </span>
              </>
            }
            progress={pct(kpis.maintenance + kpis.unavailable, kpis.total)}
            barTone="bg-[#B54E00]"
          />
          <KpiCard
            label={t("admin.fleet.kpis.listings")}
            icon={<RadioTower className="h-[18px] w-[18px]" />}
            iconTone="bg-emerald-50 text-emerald-600"
            value={String(kpis.published)}
            suffix={t("admin.fleet.kpis.published")}
            sub={
              <>
                <span className="font-semibold text-[#565E74]">
                  {t("admin.fleet.kpis.drafts", { count: kpis.drafts })}
                </span>
                <span> • </span>
                <span className="font-semibold text-[#565E74]">
                  {t("admin.fleet.kpis.suspended", { count: kpis.suspended })}
                </span>
              </>
            }
            progress={pct(kpis.published, kpis.total)}
            barTone="bg-emerald-500"
          />
        </div>
      )}

      {/* Search + segments + filter ribbon */}
      {!registryLoading && !registryError && (
        <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col justify-between gap-4 2xl:flex-row 2xl:items-center">
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
                placeholder={t("admin.fleet.searchPlaceholder")}
                className="w-full rounded-xl bg-[#EFF4FF] py-2.5 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentChip
                active={segment === "ALL"}
                label={t("admin.fleet.primeAll")}
                count={segmentCounts.ALL}
                onClick={() => {
                  setSegment("ALL");
                  resetPage();
                }}
              />
              <SegmentChip
                active={segment === "AVAILABLE"}
                label={t("admin.fleet.primeAvailable")}
                count={segmentCounts.AVAILABLE}
                onClick={() => {
                  setSegment("AVAILABLE");
                  resetPage();
                }}
              />
              <SegmentChip
                active={segment === "MAINTENANCE"}
                label={t("admin.fleet.primeMaintenance")}
                count={segmentCounts.MAINTENANCE}
                onClick={() => {
                  setSegment("MAINTENANCE");
                  resetPage();
                }}
              />
              <SegmentChip
                active={segment === "SUSPENDED"}
                label={t("admin.fleet.primeUnavailable")}
                count={segmentCounts.SUSPENDED}
                onClick={() => {
                  setSegment("SUSPENDED");
                  resetPage();
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label={t("admin.fleet.filterCompany")}
              icon={<Building2 className="h-4 w-4" />}
              value={company}
              onChange={(v) => {
                setCompany(v);
                resetPage();
              }}
              options={companyOptions.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
              allLabel={t("admin.fleet.filterCompanyAll", { count: companies.length })}
            />
            <FilterSelect
              label={t("admin.fleet.filterStatus")}
              icon={<ListFilter className="h-4 w-4" />}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={["AVAILABLE", "MAINTENANCE", "SUSPENDED"].map((s) => ({
                value: s,
                label: t(`admin.status.${s}`),
              }))}
              allLabel={t("admin.fleet.filterStatusAll")}
            />
            <FilterSelect
              label={t("admin.fleet.filterClass")}
              icon={<Car className="h-4 w-4" />}
              value={classType}
              onChange={(v) => {
                setClassType(v);
                resetPage();
              }}
              options={classOptions.map((type) => ({
                value: type,
                label: t(`admin.fleet.class.${type}`),
              }))}
              allLabel={t("admin.fleet.filterClassAll")}
            />
            <FilterSelect
              label={t("admin.fleet.filterHub")}
              icon={<MapPin className="h-4 w-4" />}
              value={hubFilter}
              onChange={(v) => {
                setHubFilter(v);
                resetPage();
              }}
              options={hubOptions.map((city) => ({ value: city, label: city }))}
              allLabel={t("admin.fleet.filterHubAll")}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t("admin.fleet.clearFilters")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Split workspace: table (8 cols) + inspection drawer (4 cols) */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Table */}
        <div className="xl:col-span-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#0B1C30]">
                  {t("admin.fleet.table.registered")}
                </span>
                <span className="rounded-full bg-[#E5EEFF] px-2 py-0.5 text-xs font-bold text-[#2563EB]">
                  {t("admin.fleet.table.records", { count: pagination.total })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#565E74]">
                <span>{t("admin.fleet.sort")}</span>
                <select
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value as SortKey);
                    resetPage();
                  }}
                  aria-label={t("admin.fleet.sort")}
                  className="cursor-pointer rounded-lg bg-[#EFF4FF] px-2 py-1.5 text-xs font-semibold text-[#0B1C30] outline-none"
                >
                  <option value="created">{t("admin.fleet.sortByCreated")}</option>
                  <option value="priceLow">{t("admin.fleet.sortByPriceLow")}</option>
                  <option value="priceHigh">{t("admin.fleet.sortByPriceHigh")}</option>
                  <option value="name">{t("admin.fleet.sortByName")}</option>
                </select>
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
              <AdminFleetTable
                vehicles={filtered}
                bookings={fleetBookings}
                selectedId={selected?._id ?? ""}
                onSelect={handleSelect}
                onViewBooking={handleViewBooking}
                pagination={pagination}
                onPageChange={setPage}
                emptyLabel={t("admin.fleet.empty")}
                loading={loading}
              />
            )}
          </section>
        </div>

        {/* Inspection drawer */}
        <div className="xl:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)]">
            {selected ? (
              <VehicleProfilePanel
                vehicle={selected}
                bookings={fleetBookings}
                onOpenDossier={() => openDossier(selected)}
                onOpenLedger={() => navigate("/admin/bookings")}
                onExport={handleExport}
              />
            ) : (
              <div className="flex h-96 flex-col items-center justify-center text-center">
                <ShieldCheck className="h-10 w-10 text-[#94A3B8]" />
                <p className="mt-4 max-w-xs text-sm text-[#64748B]">
                  {t("admin.fleet.drawer.title")}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Compliance strip */}
      {!registryLoading && !registryError && fleetVehicles.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] md:flex-row">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0B1C30]">
                {t("admin.fleet.compliance.title")}
              </h4>
              <p className="max-w-3xl text-sm text-[#565E74]">
                {t("admin.fleet.compliance.body")}
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

const transmissionLabel = (value: string): string =>
  value === "MANUAL" ? "Manual" : "Automatic";

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
  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] transition-all hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
        {label}
      </span>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </div>
    </div>
    <div className="my-3">
      <div className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
        {value} <span className="text-sm font-semibold text-[#565E74]">{suffix}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#565E74]">{sub}</div>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
      <div
        className={`h-full rounded-full ${barTone}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

interface SegmentChipProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

const SegmentChip: React.FC<SegmentChipProps> = ({ active, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
      active
        ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
        : "bg-[#EFF4FF] text-[#434655] hover:bg-[#E5EEFF]"
    }`}
  >
    {label} <span className="opacity-70">({count})</span>
  </button>
);

interface FilterSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  icon,
  value,
  onChange,
  allLabel,
  options,
}) => (
  <div className="relative">
    <label className="mb-1 ml-1 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
    </label>
    <div className="flex h-[42px] items-center rounded-xl bg-[#EFF4FF] px-3">
      <span className="mr-2 text-[#565E74]">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full cursor-pointer border-0 bg-transparent py-0 text-sm font-semibold text-[#0B1C30] outline-none"
      >
        <option value="ALL">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

// -----------------------------------------------------------------------------
// Vehicle inspection drawer
// -----------------------------------------------------------------------------

interface VehicleProfilePanelProps {
  vehicle: VehicleDto;
  bookings: BookingDto[];
  onOpenDossier: () => void;
  onOpenLedger: () => void;
  onExport: () => void;
}

const VehicleProfilePanel: React.FC<VehicleProfilePanelProps> = ({
  vehicle,
  bookings: allBookings,
  onOpenDossier,
  onOpenLedger,
  onExport,
}) => {
  const { t, i18n } = useTranslation();
  const company = companyOf(vehicle);
  const photo = photoUrl(vehicle.photos?.[0]);

  const vehicleBookings = useMemo(
    () => bookingsFor(allBookings, vehicle),
    [allBookings, vehicle],
  );
  const staged = useMemo(
    () => stagingBooking(allBookings, vehicle),
    [allBookings, vehicle],
  );
  const earned = useMemo(
    () => earnedFor(allBookings, vehicle),
    [allBookings, vehicle],
  );
  const history = useMemo(() => {
    const reserved = vehicleBookings
      .filter((b) =>
        (RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus),
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    const past = vehicleBookings
      .filter(
        (b) =>
          !(RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus),
      )
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
    return [...reserved, ...past].slice(0, 5);
  }, [vehicleBookings]);

  return (
    <div className="space-y-4 p-5">
      {/* Drawer header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
          <span className="text-sm font-bold text-[#0B1C30]">
            {t("admin.fleet.drawer.title")}
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
          {t("admin.fleet.drawer.syncedLive")}
        </span>
      </div>

      {/* Hero image with overlays */}
      <div className="relative h-56 w-full overflow-hidden rounded-xl shadow-inner">
        <img src={photo} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C30]/90 via-[#0B1C30]/30 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#0B1C30] shadow-sm backdrop-blur-md">
            {t("admin.fleet.drawer.ref", { ref: fleetRef(vehicle) })}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
          <div>
            <div className="text-[22px] font-bold leading-7 tracking-tight">
              {vehicleFullTitle(vehicle)}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#C3C6D7]">
              <span>{t(`admin.fleet.class.${vehicle.type}`)}</span>
              <span>•</span>
              <span>{vehicle.city}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-extrabold leading-7">
              {vehicle.dailyPrice}{" "}
              <span className="text-xs font-normal text-[#C3C6D7]">LYD</span>
            </div>
            <div className="text-[11px] text-[#C3C6D7]">
              {t("admin.fleet.table.perDay")}
            </div>
          </div>
        </div>
      </div>

      {/* Status + fast tags */}
      <div className="flex flex-wrap gap-2">
        {staged ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {t("admin.fleet.drawer.reservedOn", {
              ref: `#${referenceCodeFrom(staged._id)}`,
            })}
          </span>
        ) : (
          <StatusPill status={vehicle.operationalStatus} kind="vehicle" size="md" />
        )}
        <span className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-xs font-semibold text-[#565E74]">
          {t("admin.fleet.drawer.listingStatus", {
            status: t(`admin.status.${vehicle.listingStatus}`),
          })}
        </span>
      </div>

      {/* Registered specifications */}
      <div>
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
          {t("admin.fleet.drawer.specsTitle")}
        </h4>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#EFF4FF] p-3">
          <SpecTile
            icon={<Gauge className="h-4 w-4 text-[#2563EB]" />}
            label={t("admin.detail.specTransmission")}
            value={transmissionLabel(vehicle.transmission)}
          />
          <SpecTile
            icon={<Fuel className="h-4 w-4 text-[#2563EB]" />}
            label={t("admin.detail.specFuel")}
            value={vehicle.fuelType}
          />
          <SpecTile
            icon={<Armchair className="h-4 w-4 text-[#2563EB]" />}
            label={t("admin.detail.specSeats")}
            value={t("admin.fleet.table.seats", { count: vehicle.seats })}
            sub={t("admin.fleet.table.doors", { count: vehicle.doors })}
          />
          <SpecTile
            icon={<Star className="h-4 w-4 text-[#2563EB]" />}
            label={t("admin.detail.specRating")}
            value={String(vehicle.ratingsAverage)}
            sub={t("admin.fleet.drawer.ratingSub", {
              count: vehicle.ratingsQuantity,
            })}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] text-[#565E74]">
          <MiniStat label={t("admin.fleet.drawer.typeTile")} value={t(`admin.fleet.class.${vehicle.type}`)} />
          <MiniStat label={t("admin.fleet.drawer.yearTile")} value={String(vehicle.year)} />
          <MiniStat label={t("admin.fleet.drawer.doorsTile")} value={String(vehicle.doors)} />
        </div>
      </div>

      {/* Concessionaire & certification */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
          <span>{t("admin.fleet.drawer.partnerTitle")}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#EFF4FF] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E5EEFF] text-sm font-bold text-[#2563EB]">
              {initialsFrom(company?.name ?? "NexRide")}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-sm font-bold text-[#0B1C30]">
                <span className="truncate">{company ? company.name : "—"}</span>
                <BadgeCheck className="h-4 w-4 shrink-0 text-[#2563EB]" />
              </div>
              <span className="text-xs text-[#565E74]">
                {t("admin.fleet.drawer.partnerCity", {
                  city: company?.city ?? vehicle.city,
                })}
              </span>
            </div>
          </div>
          <StatusPill
            status={company?.status ?? vehicle.listingStatus}
            kind="company"
            dot={false}
          />
        </div>
        {company?.status === "APPROVED" && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-2 py-2 text-xs text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            {t("admin.fleet.drawer.approvedOperator")}
          </div>
        )}
        <div className="mt-2">
          <StatusPill status={vehicle.operationalStatus} kind="vehicle" size="sm" />
        </div>
      </div>

      {/* Recent fleet bookings */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#565E74]">
          <span>{t("admin.fleet.drawer.historyTitle")}</span>
          <span className="text-[#2563EB]">
            {t("admin.fleet.drawer.totalEarned", { value: formatLYD(earned) })}
          </span>
        </div>
        {history.length > 0 ? (
          <div className="divide-y divide-[#D3E4FE]/60 rounded-xl bg-[#EFF4FF] p-3">
            {history.map((b) => {
              const reserved = markedReserved(b);
              const label =
                b.bookingStatus === "COMPLETED"
                  ? formatDate(b.startDate, i18n.language)
                  : reserved
                    ? t("admin.fleet.drawer.reservedNow")
                    : t(`admin.status.${b.bookingStatus}`);
              return (
                <div key={b._id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0B1C30]">
                      #{referenceCodeFrom(b._id)}
                    </div>
                    <div className="truncate text-[11px] text-[#565E74]">
                      {customerName(b) || "—"} •{" "}
                      {t("admin.fleet.drawer.days", { count: b.totalDays })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${reserved ? "text-[#2563EB]" : "text-[#0B1C30]"}`}
                    >
                      {formatLYD(b.rentalPrice)} LYD
                    </div>
                    <span
                      className={`block text-[11px] font-semibold ${
                        reserved ? "text-emerald-600" : "text-[#565E74]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#EFF4FF] p-4 text-center text-xs text-[#565E74]">
            {t("admin.fleet.drawer.noBookings")}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onOpenDossier}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition-all hover:bg-[#1D4ED8]"
        >
          <FolderOpen className="h-4 w-4" />
          {t("admin.fleet.drawer.openDossier")}
        </button>
        <div className="grid grid-cols-2 gap-2 px-2 pt-1">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[#EFF4FF] px-3 py-2 text-xs font-semibold text-[#0B1C30] transition-all hover:bg-[#E5EEFF]"
          >
            <FileDown className="h-4 w-4 text-[#565E74]" />
            {t("admin.fleet.drawer.downloadCsv")}
          </button>
          <button
            type="button"
            onClick={onOpenLedger}
            className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[#EFF4FF] px-3 py-2 text-xs font-semibold text-[#0B1C30] transition-all hover:bg-[#E5EEFF]"
          >
            <ListOrdered className="h-4 w-4 text-[#565E74]" />
            {t("admin.fleet.drawer.openLedger")}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SpecTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

const SpecTile: React.FC<SpecTileProps> = ({ icon, label, value, sub }) => (
  <div className="flex flex-col rounded-lg bg-white p-2.5 shadow-sm">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
      {icon}
      {label}
    </div>
    <span className="mt-0.5 text-sm font-bold text-[#0B1C30]">{value}</span>
    {sub && <span className="text-[11px] text-[#565E74]">{sub}</span>}
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-[#EFF4FF] py-1.5">
    <span className="block text-xs font-bold text-[#0B1C30]">{value}</span>
    <span className="text-[10px] text-[#565E74]">{label}</span>
  </div>
);

export default AdminFleetPage;
