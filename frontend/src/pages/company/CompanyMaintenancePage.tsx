import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CalendarCheck2,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useCompanyMaintenance } from "../../hooks/useCompanyMaintenance";
import { formatDate } from "../../lib/bookingView";
import {
  eventCodeOf,
  eventVehicleRef,
  vehicleShortTitle,
} from "../../lib/maintenanceView";
import { CompanyMaintenanceHeader } from "../../components/company/CompanyMaintenanceHeader";
import { CompanyMaintenanceKpiCards } from "../../components/company/CompanyMaintenanceKpiCards";
import { CompanyMaintenanceHealthDeck } from "../../components/company/CompanyMaintenanceHealthDeck";
import { CompanyMaintenanceToolbar } from "../../components/company/CompanyMaintenanceToolbar";
import { CompanyMaintenanceTable } from "../../components/company/CompanyMaintenanceTable";
import { CompanyMaintenanceDrawer } from "../../components/company/CompanyMaintenanceDrawer";
import { LogMaintenanceModal } from "../../components/admin/LogMaintenanceModal";
import { MaintenanceStatusChip } from "../../components/admin/MaintenanceStatusChip";
import type {
  CreateMaintenancePayload,
  MaintenanceCategory,
  MaintenanceEventDto,
} from "../../types/admin";

/** Records due-less pending work surfaced under the ledger. */
const UPCOMING_WINDOW = 35;

/** Now-anchor resolved once at module load, so the upcoming-service window is
 *  stable across renders without an impure Date.now() call during render. */
const MOUNTED_AT = Date.now();

/** Maintenance & Inspection — tenant-scoped records, live health deck and the
 *  create/complete/release lifecycle for the operator's own fleet. */
export const CompanyMaintenancePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    data,
    summary,
    fleet,
    loading,
    error,
    busy,
    reload,
    create,
    complete,
    releaseVehicle,
    search,
    setSearch,
    status,
    setStatus,
    category,
    setCategory,
    setPage,
    resetFilters,
  } = useCompanyMaintenance();

  const [selectedId, setSelectedId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3000);
  };

  const selected = useMemo(
    () => data.events.find((e) => e._id === selectedId) ?? data.events[0] ?? null,
    [data.events, selectedId],
  );

  const pendingSorted = useMemo(() => {
    const cutoff = MOUNTED_AT + UPCOMING_WINDOW * 86400000;
    return data.events
      .filter((e) => {
        if (e.dispatchStatus === "COMPLETED") return false;
        const at = e.estReturnDate ? new Date(e.estReturnDate).getTime() : 0;
        if (e.estReturnDate && at > cutoff) return false;
        return true;
      })
      .sort((a, b) => {
        const aAt = a.estReturnDate ?? a.intakeDate ?? a.createdAt ?? "";
        const bAt = b.estReturnDate ?? b.intakeDate ?? b.createdAt ?? "";
        return new Date(aAt).getTime() - new Date(bAt).getTime();
      })
      .slice(0, 4);
  }, [data.events]);

  const openDrawer = useCallback((event: MaintenanceEventDto) => {
    setSelectedId(event._id);
    setDrawerOpen(true);
  }, []);

  const openModal = () => setModalOpen(true);

  const handleCreate = async (payload: CreateMaintenancePayload) => {
    const ok = await create(payload);
    showToast(ok ? t("company.maintenance.toasts.created") : t("company.maintenance.toasts.error"));
    if (ok) setModalOpen(false);
  };

  const handleComplete = async (event: MaintenanceEventDto) => {
    if (event.dispatchStatus === "COMPLETED") return;
    const ok = await complete(event._id);
    showToast(ok ? t("company.maintenance.toasts.completed") : t("company.maintenance.toasts.error"));
  };

  const handleRelease = async (event: MaintenanceEventDto) => {
    const vehicle = typeof event.vehicleId === "object" ? event.vehicleId : null;
    const vehicleId = vehicle?._id ?? String(event.vehicleId);
    if (!vehicleId) return;
    if (!window.confirm(t("company.maintenance.drawer.releaseConfirm"))) return;
    const ok = await releaseVehicle(vehicleId);
    showToast(ok ? t("company.maintenance.toasts.released") : t("company.maintenance.toasts.error"));
  };

  const showEmpty = simulateEmpty || (!loading && !error && data.events.length === 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyMaintenanceHeader
          loading={loading}
          totalRecords={data.pagination.total}
          onRefresh={reload}
          onScheduleInspection={openModal}
          onAddRecord={openModal}
        />

        <CompanyMaintenanceKpiCards summary={summary} />

        <CompanyMaintenanceHealthDeck
          summary={summary}
          events={data.events}
          onSelect={openDrawer}
        />

        {/* Ledger header */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 pt-4">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-[#0B1C30]">
                {t("company.maintenance.table.title")}
              </span>
              <span className="rounded-full bg-[#E5EEFF] px-2.5 py-0.5 text-xs font-bold text-[#2563EB]">
                {t("company.maintenance.recordCount", { count: data.pagination.total })}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-[#9AA4B5]">
              <ClipboardCheck className="h-4 w-4 text-[#2563EB]" />
              {t("company.maintenance.table.serialized")}
            </div>
          </div>

          <div className="p-6 pt-4">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
                <Activity className="h-10 w-10 text-[#94A3B8]" />
                <p className="mt-4 max-w-md text-sm text-[#64748B]">
                  {t("company.maintenance.loadError")}
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
                >
                  {t("company.maintenance.retry")}
                </button>
              </div>
            ) : (
              <>
                <CompanyMaintenanceToolbar
                  search={search}
                  onSearchChange={setSearch}
                  status={status}
                  onStatusChange={setStatus}
                  category={category}
                  onCategoryChange={(value) =>
                    setCategory(value as MaintenanceCategory | "ALL")
                  }
                  simulateEmpty={simulateEmpty}
                  onSimulateEmptyChange={(value) => setSimulateEmpty(value)}
                  onReset={resetFilters}
                />

                <div className="mt-4">
                  {showEmpty ? (
                    <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
                      <Wrench className="h-8 w-8 text-[#94A3B8]" />
                      <p className="mt-4 max-w-sm text-sm text-[#64748B]">
                        {t("company.maintenance.table.empty")}
                      </p>
                    </div>
                  ) : (
                    <CompanyMaintenanceTable
                      rows={data.events}
                      selectedId={selectedId}
                      onSelect={openDrawer}
                      onComplete={handleComplete}
                      busy={busy}
                      pagination={data.pagination}
                      onPageChange={setPage}
                      loading={loading}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Upcoming scheduled maintenance + Safety & MoT registry */}
        {!loading && !error && !showEmpty && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
                  {t("company.maintenance.upcoming.title")}
                </h3>
                <CalendarCheck2 className="h-5 w-5 text-[#2563EB]" />
              </div>
              {pendingSorted.length === 0 ? (
                <div className="mt-3 flex h-36 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] text-center">
                  <p className="text-xs font-semibold text-[#64748B]">
                    {t("company.maintenance.upcoming.empty")}
                  </p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {pendingSorted.map((event) => (
                    <li key={event._id}>
                      <button
                        type="button"
                        onClick={() => openDrawer(event)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-start transition-colors hover:bg-[#F8FAFC] cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#0B1C30]">
                            {vehicleShortTitle(event)}
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#2563EB]">
                            {eventVehicleRef(event)}
                            <span className="text-[#C3C6D7]">•</span>
                            <span className="font-sans font-semibold text-[#565E74]">
                              {t(`admin.maintenance.categories.${event.category}`)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#565E74]">
                            {event.estReturnDate
                              ? formatDate(event.estReturnDate, i18n.language)
                              : "—"}
                          </span>
                          <MaintenanceStatusChip status={event.dispatchStatus} showLock={false} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col rounded-2xl border border-dashed border-[#C3C6D7] bg-[#F8FAFC] p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#94A3B8]" />
                  <h3 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
                    {t("company.maintenance.mot.title")}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                  <Sparkles className="h-3 w-3" />
                  {t("company.maintenance.soon")}
                </span>
              </div>
              <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#D3E4FE] bg-white/60 text-center">
                <p className="max-w-[280px] text-xs font-semibold leading-relaxed text-[#64748B]">
                  {t("company.maintenance.mot.subtitle")}
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 rounded-xl bg-[#EFF4FF] px-4 py-2 text-xs font-bold text-[#2563EB] opacity-70"
                >
                  {t("company.maintenance.mot.download")}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Record code legend */}
        <div className="flex items-center gap-2 rounded-2xl border border-[#E5EEFF] bg-[#F8FAFF] px-4 py-3 text-xs text-[#565E74]">
          <Wrench className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
          <span>
            {t("company.maintenance.disclaimer", {
              count: data.pagination.total,
              code: selected ? eventCodeOf(selected) : "MNT-000000",
            })}
          </span>
        </div>
      </div>

      {/* Slide-over record detail */}
      <CompanyMaintenanceDrawer
        event={selected}
        open={drawerOpen}
        busy={busy}
        onClose={() => setDrawerOpen(false)}
        onComplete={handleComplete}
        onRelease={handleRelease}
      />

      {/* Add Maintenance Record */}
      {modalOpen && (
        <LogMaintenanceModal
          vehicles={fleet}
          busy={busy}
          onClose={() => setModalOpen(false)}
          onSubmit={(payload) => void handleCreate(payload)}
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

export default CompanyMaintenancePage;