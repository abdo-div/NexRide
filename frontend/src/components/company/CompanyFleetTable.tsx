import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import type { CompanyFleetVehicle } from "../../types/companyFleet";
import {
  FleetStatusPill,
  PriceBlock,
} from "./CompanyFleetBits";
import { categoryLabel } from "./companyFleetUi";

interface CompanyFleetTableProps {
  rows: CompanyFleetVehicle[];
  selectedId: string | null;
  onSelect: (row: CompanyFleetVehicle) => void;
}

/** Fleet register in a dense partner table, mirrors the mock's list view. */
export const CompanyFleetTable: React.FC<CompanyFleetTableProps> = ({
  rows,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const LocationBadge = ({ row }: { row: CompanyFleetVehicle }) =>
    row.city || row.pickupLocation ? (
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[#0B1C30]">{row.city ?? "—"}</span>
        {row.pickupLocation && (
          <span className="flex items-center gap-1 text-xs text-[#9AA4B5]">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="truncate max-w-[160px]">{row.pickupLocation}</span>
          </span>
        )}
      </div>
    ) : (
      <span className="text-xs text-[#9AA4B5]">—</span>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.vehicle")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.id")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.category")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.pricing")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.hub")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.status")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.bookings")}
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.fleetPage.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                className={`cursor-pointer border-b border-[#F1F5F9] transition-colors last:border-0 hover:bg-[#F7F9FC] ${
                  selectedId === row.id ? "bg-[#EFF4FF]" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F1F5F9]">
                      {row.photo ? (
                        <img
                          src={row.photo}
                          alt={`${row.make} ${row.model}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#9AA4B5]">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0B1C30]">
                          {row.make} {row.model}
                        </span>
                        {row.year && (
                          <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#565E74]">
                            {row.year}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[#9AA4B5]">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {t("company.fleetPage.badge", {
                          bookings: row.bookings,
                        })}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-1 font-mono text-[11px] font-semibold text-[#565E74]">
                    {row.code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#F7F9FC] px-2.5 py-1 text-xs font-bold text-[#565E74]">
                    {categoryLabel(t, row.type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PriceBlock weeklyPrice={row.weeklyPrice} dailyPrice={row.dailyPrice} />
                </td>
                <td className="px-4 py-3">
                  <LocationBadge row={row} />
                </td>
                <td className="px-4 py-3">
                  <FleetStatusPill status={row.displayStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0B1C30]">{row.bookings}</span>
                    <span className="text-[11px] text-[#9AA4B5]">{t("company.fleetPage.rides")}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/company/fleet/${row.id}`);
                      }}
                      className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
                    >
                      {t("company.fleetPage.actions.view")}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/company/fleet/${row.id}/edit`);
                      }}
                      className="rounded-lg p-1.5 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB] cursor-pointer"
                      title={t("company.fleetPage.actions.edit")}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyFleetTable;