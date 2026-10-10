import React from "react";
import { useTranslation } from "react-i18next";
import { Car, Crown, Gauge } from "lucide-react";
import { moneyOf } from "../../lib/companyEarningsView";
import type {
  CompanyEarningsMixRow,
  CompanyTopVehicleRow,
} from "../../types/companyEarnings";

interface CompanyTopVehiclesProps {
  topVehicles: CompanyTopVehicleRow[];
  mix: CompanyEarningsMixRow[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  loading: boolean;
}

/**
 * Top Vehicles by Yield — the five highest-grossing vehicles of the selected
 * window (ranked, with share of gross), plus the Fleet Yield Mix that splits
 * the same window across vehicle types. Clicking a row drops the register down
 * to that vehicle's transactions.
 */
export const CompanyTopVehicles: React.FC<CompanyTopVehiclesProps> = ({
  topVehicles,
  mix,
  selectedVehicleId,
  onSelectVehicle,
  loading,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#F1F5F9] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#FFF4E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#B45309]">
            <Gauge className="me-1 h-3 w-3" aria-hidden="true" />
            {t("company.payoutsPage.topVehicles.badge")}
          </span>
        </div>
        <h2 className="mt-2 text-[16px] font-bold text-[#0B1C30]">
          {t("company.payoutsPage.topVehicles.title")}
        </h2>
        <span className="text-[12px] font-semibold text-[#565E74]">
          {t("company.payoutsPage.topVehicles.titleAr")}
        </span>
      </div>

      <div className="flex-1 space-y-2 p-5">
        {topVehicles.length === 0 && (
          <p className="py-8 text-center text-[12px] font-semibold text-[#9AA4B5]">
            {t("company.payoutsPage.topVehicles.empty")}
          </p>
        )}
        {topVehicles.map((row) => {
          const { vehicle } = row;
          const rankBadge =
            row.rank === 1
              ? "bg-[#0B1C30] text-white"
              : "bg-[#F1F5F9] text-[#64748B]";
          const photo = vehicle.photo;
          return (
            <button
              key={vehicle.id}
              type="button"
              disabled={loading}
              onClick={() =>
                onSelectVehicle(
                  selectedVehicleId === vehicle.id ? "" : vehicle.id,
                )
              }
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                selectedVehicleId === vehicle.id
                  ? "border-[#2563EB] bg-[#EFF4FF]"
                  : "border-slate-100 bg-[#F8FAFF] hover:border-[#C7D2FE]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${rankBadge}`}
              >
                {row.rank}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#E5EEFF] text-[#2563EB]">
                {photo ? (
                  <img
                    src={photo}
                    alt={vehicle.make}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Car className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-[#0B1C30]">
                  {vehicle.make} {vehicle.model}
                  {vehicle.year ? ` (${vehicle.year})` : ""}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
                  {t("company.payoutsPage.topVehicles.jobs", {
                    count: row.bookings,
                  })}
                  <span className="h-3 w-px bg-[#E2E8F0]" />
                  {moneyOf(row.gross)}
                </span>
                <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-[#E5EEFF]">
                  <span
                    className="block h-full rounded-full bg-[#2563EB]"
                    style={{ width: `${Math.min(100, row.sharePct)}%` }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-extrabold text-[#0B1C30]">
                {row.sharePct.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {mix.length > 0 && (
        <div className="border-t border-[#F1F5F9] p-5">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
            <h3 className="text-[13px] font-bold text-[#0B1C30]">
              {t("company.payoutsPage.topVehicles.mixTitle")}
            </h3>
          </div>
          <div className="mt-3 space-y-2.5">
            {mix.map((row) => (
              <div key={row.type} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-[12px] font-semibold text-[#565E74]">
                  {row.type}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <span
                    className="block h-full rounded-full bg-[#F59E0B]"
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-end text-[12px] font-extrabold text-[#0B1C30]">
                  {row.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyTopVehicles;