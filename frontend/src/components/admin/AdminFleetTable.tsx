import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Car, MoreHorizontal, MapPin } from "lucide-react";
import type { BookingDto } from "../../types/booking";
import type { VehicleDto } from "../../types/vehicle";
import { formatDate, referenceCodeFrom } from "../../lib/bookingView";
import { companyOf, stagingBooking } from "../../lib/fleetView";
import { photoUrl } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

export interface AdminFleetTableProps {
  vehicles: VehicleDto[];
  bookings: BookingDto[];
  selectedId: string;
  onSelect: (vehicle: VehicleDto) => void;
  onViewBooking: (bookingId: string) => void;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  emptyLabel: string;
}

/** Shared fleet table used by the Fleet & Vehicles page (real data only). */
export const AdminFleetTable: React.FC<AdminFleetTableProps> = ({
  vehicles,
  bookings,
  selectedId,
  onSelect,
  onViewBooking,
  page,
  pageSize = 8,
  onPageChange,
  emptyLabel,
}) => {
  const { t, i18n } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(vehicles.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => vehicles.slice((safePage - 1) * pageSize, safePage * pageSize),
    [vehicles, safePage, pageSize],
  );

  if (vehicles.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          <Car className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("admin.fleet.table.vehicle")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.branch")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.partner")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.rate")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.status")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.assignment")}</th>
              <th className="px-4 py-3">{t("admin.fleet.table.specs")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">{t("admin.fleet.table.actions")}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {slice.map((v) => {
              const company = companyOf(v);
              const staged = stagingBooking(bookings, v);
              const photo = photoUrl(v.photos?.[0]);
              const selected = v._id === selectedId;
              return (
                <tr
                  key={v._id}
                  onClick={() => onSelect(v)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected ? "bg-[#EFF4FF]/80" : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="py-3.5 pl-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-[#EFF4FF] shadow-sm">
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#0B1C30]">{vehicleTitle(v)}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-[#565E74]">
                          <span className="font-bold text-[#2563EB]">{v.year}</span>
                          <span>•</span>
                          <span className="truncate">{t(`admin.fleet.class.${v.type}`)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-1.5 rounded bg-[#EFF4FF] px-2 py-0.5 text-xs font-bold text-[#0B1C30]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                        {v.city}
                      </span>
                      <span className="mt-0.5 max-w-[180px] truncate text-xs text-[#565E74]">
                        {v.pickupLocation}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[130px] flex-col">
                      <div className="flex items-center gap-1 text-sm font-semibold text-[#0B1C30]">
                        <span className="truncate">{company ? company.name : "—"}</span>
                        {company && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-[#2563EB]" />
                        )}
                      </div>
                      <span className="text-xs text-[#565E74]">
                        {company ? company.city ?? "" : t("admin.fleet.drawer.listingStatus", { status: v.listingStatus })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#0B1C30]">
                      {v.dailyPrice}{" "}
                      <span className="text-xs font-normal text-[#565E74]">LYD</span>
                      <span className="ml-0.5 text-xs font-normal text-[#565E74]">
                        {t("admin.fleet.table.perDay")}
                      </span>
                    </div>
                    <span className="text-xs text-[#565E74]">{transmissionLabel(v.transmission)}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusPill status={v.operationalStatus} kind="vehicle" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[150px]">
                      {staged ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewBooking(staged._id);
                            }}
                            className="px-0 text-sm font-bold text-[#2563EB] hover:underline cursor-pointer"
                          >
                            #{referenceCodeFrom(staged._id)}
                          </button>
                          <div className="truncate text-xs text-[#565E74]">
                            {t("admin.fleet.table.departsOn", {
                              date: formatDate(staged.startDate, i18n.language),
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-[#0B1C30]">
                            {t("admin.fleet.table.stagedAt", { place: v.pickupLocation })}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#565E74]">
                            <MapPin className="h-3 w-3" />
                            {v.city}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[#0B1C30]">
                      {t("admin.fleet.table.seats", { count: v.seats })}
                    </div>
                    <span className="text-xs text-[#565E74]">
                      {transmissionLabel(v.transmission)} • {v.fuelType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(v)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        {t("admin.fleet.table.inspect")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(v)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.fleet.table.actions")}
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

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-[#565E74] sm:flex-row">
        <div>
          {t("admin.fleet.table.showingOf", {
            shown: slice.length,
            total: vehicles.length,
          })}
        </div>
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

const vehicleTitle = (v: VehicleDto): string =>
  [v.make, v.model].filter(Boolean).join(" ") || "NexRide Vehicle";

const transmissionLabel = (value: string): string =>
  value === "MANUAL" ? "Manual" : "Automatic";

export default AdminFleetTable;