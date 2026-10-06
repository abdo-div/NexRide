import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ChevronRight, MapPin, ScanLine } from "lucide-react";
import type { CompanyFleetVehicle } from "../../types/companyFleet";
import { FleetStatusPill, PriceBlock } from "./CompanyFleetBits";
import { categoryLabel } from "./companyFleetUi";

interface CompanyFleetGridProps {
  rows: CompanyFleetVehicle[];
  onSelect: (row: CompanyFleetVehicle) => void;
}

/** Card gallery view of the fleet — image, code, location overlay, spec + pricing. */
export const CompanyFleetGrid: React.FC<CompanyFleetGridProps> = ({ rows, onSelect }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative h-44 shrink-0 bg-[#F1F5F9]">
            {row.photo ? (
              <img
                src={row.photo}
                alt={`${row.make} ${row.model}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#9AA4B5]">
                {t("company.fleetPage.noPhoto")}
              </div>
            )}

            <div className="absolute left-3 top-3">
              <FleetStatusPill status={row.displayStatus} />
            </div>

            <span className="absolute right-3 top-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
              {row.code}
            </span>

            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden="true" />
              <span className="truncate text-xs font-semibold text-white">
                {row.city ?? row.pickupLocation ?? "—"}
              </span>
              {row.pickupLocation && row.pickupLocation !== row.city && (
                <span className="truncate text-[11px] text-white/70">
                  · {row.pickupLocation}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate(`/company/fleet/${row.id}`)}
                className="group/title text-left cursor-pointer"
              >
                <h3 className="text-sm font-bold text-[#0B1C30] group-hover/title:text-[#2563EB]">
                  {row.make} {row.model}
                  {row.year ? (
                    <span className="ml-1.5 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#565E74]">
                      {row.year}
                    </span>
                  ) : null}
                </h3>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] opacity-0 transition-opacity group-hover/title:opacity-100">
                  {t("company.vehiclePage.openDossier")}
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </button>
            </div>
            <p className="text-xs text-[#9AA4B5]">
              {categoryLabel(t, row.type)}
              <span className="mx-1">•</span>
              {t(`company.fleetPage.transmission.${row.transmission ?? "AUTOMATIC"}`)}
              <span className="mx-1">•</span>
              {t(`company.fleetPage.fuel.${row.fuelType ?? "GASOLINE"}`)}
            </p>

            <div className="mt-auto flex items-end justify-between gap-2 border-t border-[#F1F5F9] pt-3">
              <PriceBlock
                compact
                weeklyPrice={row.weeklyPrice}
                dailyPrice={row.dailyPrice}
              />
              <button
                type="button"
                onClick={() => onSelect(row)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8] cursor-pointer"
              >
                <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                {t("company.fleetPage.actions.inspect")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyFleetGrid;