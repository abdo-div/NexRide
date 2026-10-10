import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { Activity } from "lucide-react";
import { useCompanyVehicle } from "../../hooks/useCompanyVehicle";
import { CompanyVehicleHeader } from "../../components/company/CompanyVehicleHeader";
import { CompanyVehicleGallery } from "../../components/company/CompanyVehicleGallery";
import { CompanyVehicleOperationalBar } from "../../components/company/CompanyVehicleOperationalBar";
import { CompanyVehicleSpecGrid } from "../../components/company/CompanyVehicleSpecGrid";
import { CompanyVehicleDescription } from "../../components/company/CompanyVehicleDescription";
import { CompanyVehicleLocation } from "../../components/company/CompanyVehicleLocation";
import { CompanyVehiclePricing } from "../../components/company/CompanyVehiclePricing";
import { CompanyVehicleCalendar } from "../../components/company/CompanyVehicleCalendar";
import { CompanyVehiclePerformance } from "../../components/company/CompanyVehiclePerformance";
import { CompanyVehicleMarketplace } from "../../components/company/CompanyVehicleMarketplace";
import { CompanyVehicleActivity } from "../../components/company/CompanyVehicleActivity";
import { CompanyVehicleTripsHistory } from "../../components/company/CompanyVehicleTripsHistory";

const CardSkeleton: React.FC = () => (
  <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
);

/**
 * Vehicle profile page — the full operations dossier for one of the
 * operator's own fleet units (drill-down from Fleet & Vehicles). Dossier,
 * calendar and trips all come straight from the tenant-scoped endpoint.
 */
export const CompanyVehiclePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { vehicleId } = useParams<{ vehicleId: string }>();

  const { data, loading, error, reload, search, setSearch, setPage } =
    useCompanyVehicle(vehicleId ?? "");

  const handleViewAll = useCallback(() => {
    navigate("/company/bookings");
  }, [navigate]);

  const { vehicle } = data;
  const pagination = data.trips.pagination;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyVehicleHeader data={data} loading={loading} />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="flex flex-col gap-6 xl:col-span-7">
                <div className="h-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-6 xl:col-span-5">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
            <CardSkeleton />
          </div>
        ) : error ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <Activity className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.vehiclePage.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.overview.retry")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="flex flex-col gap-6 xl:col-span-7">
                <CompanyVehicleGallery vehicle={vehicle} />
                <CompanyVehicleOperationalBar data={data} />
                <CompanyVehicleSpecGrid vehicle={vehicle} />
                <CompanyVehicleDescription vehicle={vehicle} />
                <CompanyVehicleLocation vehicle={vehicle} />
              </div>
              <div className="flex flex-col gap-6 xl:col-span-5">
                <CompanyVehiclePricing vehicle={vehicle} />
                <CompanyVehicleCalendar data={data} />
                <CompanyVehiclePerformance data={data} />
                <CompanyVehicleMarketplace vehicle={vehicle} lang={i18n.language} />
                <CompanyVehicleActivity trips={data.trips.list} lang={i18n.language} />
              </div>
            </div>

            <CompanyVehicleTripsHistory
              trips={data.trips.list}
              total={pagination.total}
              page={pagination.page}
              totalPages={pagination.totalPages}
              canGoPrevious={pagination.hasPreviousPage}
              canGoNext={pagination.hasNextPage}
              search={search}
              onSearchChange={setSearch}
              onPageChange={setPage}
              onViewAll={handleViewAll}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyVehiclePage;