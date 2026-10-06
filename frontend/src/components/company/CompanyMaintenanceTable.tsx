import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, FileText, Sparkles, Wrench } from "lucide-react";
import { formatDate, formatLYD } from "../../lib/bookingView";
import {
  eventCodeOf,
  eventVehicleRef,
  vehicleOf,
  vehicleShortTitle,
} from "../../lib/maintenanceView";
import { photoUrl } from "../../lib/vehicleMapper";
import { VehicleImage } from "../VehicleImage";
import { MaintenanceStatusChip } from "../admin/MaintenanceStatusChip";
import { AdminPagination } from "../admin/AdminPagination";
import type { MaintenanceEventDto, PaginationMeta } from "../../types/admin";

interface CompanyMaintenanceTableProps {
  rows: MaintenanceEventDto[];
  selectedId: string;
  onSelect: (event: MaintenanceEventDto) => void;
  onComplete: (event: MaintenanceEventDto) => void;
  busy: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

/**
 * Maintenance Records ledger — one row per real backend event. Dates map to
 * intake/return, cost to the estimated invoice total, service status to the
 * dispatch chip. The Inspection Result column has no data model yet, so it
 * renders a coming-soon marker rather than a fabricated verdict.
 */
export const CompanyMaintenanceTable: React.FC<CompanyMaintenanceTableProps> = ({
  rows,
  selectedId,
  onSelect,
  onComplete,
  busy,
  pagination,
  onPageChange,
  loading = false,
}) => {
  const { t, i18n } = useTranslation();

  if (rows.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EEFF] text-[#2563EB]">
          <Wrench className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">
          {t("company.maintenance.table.empty")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("company.maintenance.table.vehicle")}</th>
              <th className="px-4 py-3">{t("company.maintenance.table.scope")}</th>
              <th className="px-4 py-3">{t("company.maintenance.table.serviceDate")}</th>
              <th className="px-4 py-3">{t("company.maintenance.table.nextService")}</th>
              <th className="px-4 py-3 text-right">{t("company.maintenance.table.cost")}</th>
              <th className="px-4 py-3">{t("company.maintenance.table.status")}</th>
              <th className="px-4 py-3">{t("company.maintenance.table.inspection")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("company.maintenance.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((event) => {
              const vehicle = vehicleOf(event);
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
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E5EEFF]">
                        <VehicleImage
                          src={photoUrl(vehicle?.photos?.[0])}
                          alt={vehicle?.make ?? ""}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {vehicleShortTitle(event)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-[#2563EB]">
                            {eventVehicleRef(event)}
                          </span>
                          <span className="text-[#C3C6D7]">•</span>
                          <span className="font-sans font-semibold text-[#9AA4B5]">
                            {eventCodeOf(event)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[180px]">
                      <span className="text-[13px] font-semibold text-[#0B1C30]">
                        {t(`admin.maintenance.categories.${event.category}`)}
                      </span>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
                        {t(`admin.maintenance.priorities.${event.priority}`)}
                        {event.workshop ? ` · ${event.workshop}` : ""}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-[#565E74]">
                        {event.triggerReason || "—"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="whitespace-nowrap text-[13px] font-semibold text-[#0B1C30]">
                      {event.intakeDate
                        ? formatDate(event.intakeDate, i18n.language)
                        : event.createdAt
                          ? formatDate(event.createdAt, i18n.language)
                          : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="whitespace-nowrap text-[13px] text-[#565E74]">
                      {event.estReturnDate
                        ? formatDate(event.estReturnDate, i18n.language)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="whitespace-nowrap text-[13px] font-extrabold text-[#0B1C30]">
                      {formatLYD(event.estCost)}
                    </span>
                    <span className="ml-1 text-[10px] font-bold text-[#565E74]">LYD</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <MaintenanceStatusChip status={event.dispatchStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]"
                      title={t("company.maintenance.soon")}
                    >
                      <Sparkles className="h-3 w-3" />
                      {t("company.maintenance.soon")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onComplete(event);
                        }}
                        disabled={busy || !locked}
                        title={
                          locked ? t("company.maintenance.table.completeWork") : undefined
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(event);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {t("company.maintenance.table.details")}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination
        pagination={pagination}
        onPageChange={onPageChange}
        shownCount={rows.length}
        loading={loading}
      />
    </div>
  );
};

export default CompanyMaintenanceTable;