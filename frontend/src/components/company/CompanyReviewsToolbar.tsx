import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Filter, RotateCcw, Star } from "lucide-react";
import type {
  CompanyReviewPeriodFilter,
  CompanyReviewStatusFilter,
  CompanyReviewVehicleRef,
} from "../../types/companyReviews";

interface CompanyReviewsToolbarProps {
  star: number | "all";
  onStarChange: (star: number | "all") => void;
  vehicleId: string;
  onVehicleChange: (vehicleId: string) => void;
  vehicles: CompanyReviewVehicleRef[];
  status: CompanyReviewStatusFilter;
  onStatusChange: (status: CompanyReviewStatusFilter) => void;
  period: CompanyReviewPeriodFilter;
  onPeriodChange: (period: CompanyReviewPeriodFilter) => void;
  onClear: () => void;
}

const baseSelect =
  "w-full cursor-pointer appearance-none rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] px-3 py-2.5 pr-8 text-sm font-medium text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]";

const StackedLabel: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="relative block">
    <span className="pointer-events-none absolute left-3 top-2 z-10 text-[10px] font-bold uppercase tracking-wider text-[#9AA4B5]">
      {label}
    </span>
    {children}
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
      aria-hidden="true"
    />
  </label>
);

/**
 * Register filters for the All Ratings list. Star / vehicle / status / period
 * map directly onto the backend query; only the register is filtered — the
 * analytical deck above always reflects the tenant's full review set.
 */
export const CompanyReviewsToolbar: React.FC<CompanyReviewsToolbarProps> = ({
  star,
  onStarChange,
  vehicleId,
  onVehicleChange,
  vehicles,
  status,
  onStatusChange,
  period,
  onPeriodChange,
  onClear,
}) => {
  const { t } = useTranslation();

  const isDefault =
    star === "all" && vehicleId === "" && status === "all" && period === "all";

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-white p-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Rating */}
      <StackedLabel label={t("company.reviewsPage.register.filterStar")}>
        <select
          value={star}
          onChange={(event) =>
            onStarChange(
              event.target.value === "all"
                ? "all"
                : Number(event.target.value),
            )
          }
          className={`${baseSelect} pt-5 pb-1 pl-14`}
        >
          <option value="all">{t("company.reviewsPage.register.allStars")}</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {t(
                value === 1
                  ? "company.reviewsPage.register.star"
                  : "company.reviewsPage.register.starPlural",
                { stars: value },
              )}
            </option>
          ))}
        </select>
        <Star
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500"
          fill="currentColor"
          aria-hidden="true"
        />
      </StackedLabel>

      {/* Vehicle */}
      <StackedLabel label={t("company.reviewsPage.register.filterVehicle")}>
        <select
          value={vehicleId}
          onChange={(event) => onVehicleChange(event.target.value)}
          disabled={vehicles.length === 0}
          className={`${baseSelect} pt-5 pb-1 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <option value="">{t("company.reviewsPage.register.allVehicles")}</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model}
              {vehicle.year ? ` (${vehicle.year})` : ""}
            </option>
          ))}
        </select>
      </StackedLabel>

      {/* Status */}
      <StackedLabel label={t("company.reviewsPage.register.filterStatus")}>
        <select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as CompanyReviewStatusFilter)
          }
          className={`${baseSelect} pt-5 pb-1`}
        >
          <option value="all">{t("company.reviewsPage.register.allStatuses")}</option>
          <option value="responded">
            {t("company.reviewsPage.register.statusResponded")}
          </option>
          <option value="awaiting">
            {t("company.reviewsPage.register.statusAwaiting")}
          </option>
        </select>
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]" aria-hidden="true" />
      </StackedLabel>

      {/* Period */}
      <StackedLabel label={t("company.reviewsPage.register.filterPeriod")}>
        <select
          value={period}
          onChange={(event) =>
            onPeriodChange(event.target.value as CompanyReviewPeriodFilter)
          }
          className={`${baseSelect} pt-5 pb-1`}
        >
          <option value="all">{t("company.reviewsPage.register.allPeriods")}</option>
          <option value="30d">{t("company.reviewsPage.register.last30")}</option>
          <option value="90d">{t("company.reviewsPage.register.last90")}</option>
          <option value="year">
            {t("company.reviewsPage.register.year", {
              year: new Date().getFullYear(),
            })}
          </option>
        </select>
      </StackedLabel>

      {!isDefault && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFE4E5] px-3 py-2.5 text-[12px] font-bold text-[#BA1A1A] transition-colors hover:bg-[#FFDBE0] cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.reviewsPage.register.clear")}
        </button>
      )}
    </div>
  );
};

export default CompanyReviewsToolbar;