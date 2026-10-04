import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Wrench,
} from "lucide-react";
import type { MaintenanceEventDto } from "../../types/admin";
import { formatDate, formatLYD } from "../../lib/bookingView";
import {
  companyOf,
  eventCodeOf,
  eventVehicleRef,
  vehicleOf,
} from "../../lib/maintenanceView";
import { MaintenanceStatusChip } from "./MaintenanceStatusChip";

export interface AdminMaintenanceTableProps {
  rows: MaintenanceEventDto[];
  selectedId: string;
  onSelect: (event: MaintenanceEventDto) => void;
  openDossier: (event: MaintenanceEventDto) => void;
  completeEvent: (event: MaintenanceEventDto) => void;
  busy: boolean;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  emptyLabel: string;
}

/** Maintenance & quarantine ledger — every row is a real backend event. */
export const AdminMaintenanceTable: React.FC<AdminMaintenanceTableProps> = ({
  rows,
  selectedId,
  onSelect,
  openDossier,
  completeEvent,
  busy,
  page,
  pageSize = 8,
  onPageChange,
  emptyLabel,
}) => {
  const { t, i18n } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EEFF] text-[#2563EB]">
          <Wrench className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#565E74]">
          {t("admin.maintenance.filters.showingCount", {
            shown: Math.min(rows.length, (safePage - 1) * pageSize + 1),
            total: rows.length,
          })}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#565E74]">
          {t("admin.maintenance.table.records", { count: rows.length })}
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("admin.maintenance.table.vehicle")}</th>
              <th className="px-4 py-3">{t("admin.maintenance.table.garage")}</th>
              <th className="px-4 py-3">{t("admin.maintenance.table.category")}</th>
              <th className="px-4 py-3">{t("admin.maintenance.table.trigger")}</th>
              <th className="px-4 py-3">{t("admin.maintenance.table.timeline")}</th>
              <th className="px-4 py-3">{t("admin.maintenance.table.dispatch")}</th>
              <th className="px-4 py-3 text-right">{t("admin.maintenance.table.cost")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("admin.maintenance.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {slice.map((event) => {
              const vehicle = vehicleOf(event);
              const company = companyOf(event);
              const selected = event._id === selectedId;
              const locked = event.dispatchStatus !== "COMPLETED";

              return (
                <tr
                  key={event._id}
                  onClick={() => onSelect(event)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected
                      ? "bg-[#EFF4FF]/80"
                      : event.dispatchStatus === "OVERDUE"
                        ? "bg-red-50/40 hover:bg-red-50/70"
                        : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[190px] items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-xs font-bold text-[#2563EB]">
                        {(vehicle?.make ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {vehicle
                            ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`
                            : t("admin.maintenance.table.unknown")}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#2563EB]">
                          {eventVehicleRef(event)}
                          <span className="text-[#C3C6D7]">•</span>
                          <span className="font-sans font-semibold text-[#565E74]">
                            {eventCodeOf(event)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[150px]">
                      <div className="truncate text-[13px] font-semibold text-[#0B1C30]">
                        {company?.name ?? t("admin.maintenance.dossier.none")}
                      </div>
                      <div className="truncate text-xs text-[#565E74]">
                        {event.workshop || company?.city || ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[140px]">
                      <span className="text-[13px] font-semibold text-[#0B1C30]">
                        {t(`admin.maintenance.categories.${event.category}`)}
                      </span>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
                        {t(`admin.maintenance.priorities.${event.priority}`)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[220px]">
                      <span className="line-clamp-2 text-[13px] text-[#565E74]">
                        {event.triggerReason || "—"}
                      </span>
                      {(event.dtcCodes?.length ?? 0) > 0 && (
                        <div className="mt-0.5 font-mono text-[10px] font-bold text-amber-600">
                          {event.dtcCodes
                            ?.slice(0, 2)
                            .map((d) => d.code)
                            .join(" ")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[150px] text-xs text-[#565E74]">
                      <div className="font-semibold text-[#0B1C30]">
                        {event.intakeDate
                          ? formatDate(event.intakeDate, i18n.language)
                          : "—"}
                        <span className="mx-1 text-[#C3C6D7]">→</span>
                        {event.dispatchStatus === "COMPLETED" && event.completedDate
                          ? formatDate(event.completedDate, i18n.language)
                          : event.estReturnDate
                            ? formatDate(event.estReturnDate, i18n.language)
                            : "—"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#565E74]">
                        {event.technician || ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <MaintenanceStatusChip status={event.dispatchStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="whitespace-nowrap text-[13px] font-extrabold text-[#0B1C30]">
                      {formatLYD(event.estCost)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => completeEvent(event)}
                        title={
                          locked
                            ? t("admin.maintenance.table.complete")
                            : undefined
                        }
                        className={`hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all md:inline-flex cursor-pointer ${
                          locked
                            ? "bg-[#EFF4FF] text-[#2563EB] enabled:hover:bg-[#2563EB] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {locked ? (
                          <Wrench className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDossier(event)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {t("admin.maintenance.table.dossier")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(event)}
                        className="rounded-lg p-1.5 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.maintenance.table.actions")}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#565E74]">
        <span>{t("admin.maintenance.count", { count: rows.length })}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {t("admin.table.prev")}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  p === safePage
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "bg-[#EFF4FF] text-[#565E74] hover:bg-[#E5EEFF]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {t("admin.table.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMaintenanceTable;