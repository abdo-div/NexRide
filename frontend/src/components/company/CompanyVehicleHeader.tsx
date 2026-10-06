import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  Archive,
  ArrowLeft,
  CalendarX2,
  ChevronRight,
  Cpu,
  Edit,
  FileText,
  MoreVertical,
  Settings,
} from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleData } from "../../types/companyVehicle";
import { FleetStatusPill } from "./CompanyFleetBits";
import { categoryLabel } from "./companyFleetUi";

interface CompanyVehicleHeaderProps {
  data: CompanyVehicleData;
  loading: boolean;
}

/**
 * Breadcrumb + live telematics flag, then the hero row: H1 make/model, the
 * real status pill, category chip, metadata ribbon and the action button
 * group (write actions stay behind "coming soon" — no partner edit forms exist).
 */
export const CompanyVehicleHeader: React.FC<CompanyVehicleHeaderProps> = ({
  data,
  loading,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { vehicle, company } = data;
  const hub = vehicle.city ?? vehicle.pickupLocation;

  const moreItems = [
    { key: "print", icon: FileText },
    { key: "maintenance", icon: Cpu },
    { key: "unpublish", icon: CalendarX2 },
    { key: "archive", icon: Archive },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>Portal</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("company.bookingsPage.command")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <button
            type="button"
            onClick={() => navigate("/company/fleet")}
            className="hover:text-[#2563EB] hover:underline cursor-pointer"
          >
            {t("company.fleetPage.primary")}
          </button>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">
            {vehicle.make} {vehicle.model}
            {vehicle.year ? ` (${vehicle.year})` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-sm">
          {vehicle.gpsActive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0BA05F] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0BA05F]" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
          )}
          <span className="text-xs font-bold text-[#0B1C30]">
            {hub ?? ""} • {t(vehicle.gpsActive ? "company.vehiclePage.live" : "company.vehiclePage.offline")}
          </span>
          {vehicle.coordinates && (
            <span className="font-mono text-[11px] text-[#9AA4B5]">
              {Number(vehicle.coordinates[1]).toFixed(4)}° N,{" "}
              {Number(vehicle.coordinates[0]).toFixed(4)}° E
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
                {vehicle.make} {vehicle.model}
              </h1>
              {!loading && (
                <FleetStatusPill status={vehicle.displayStatus} />
              )}
              <span className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#565E74]">
                {categoryLabel(t, vehicle.type)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#565E74]">
              {vehicle.year && (
                <span className="font-bold text-[#0B1C30]">{vehicle.year}</span>
              )}
              <span className="text-[#C3C6D7]">•</span>
              <span>{t(`company.fleetPage.category.${vehicle.type ?? "unknown"}`)}</span>
              <span className="text-[#C3C6D7]">•</span>
              <span>
                {t(`company.fleetPage.transmission.${vehicle.transmission ?? "AUTOMATIC"}`)}
              </span>
              <span className="text-[#C3C6D7]">•</span>
              <span>{t(`company.fleetPage.fuel.${vehicle.fuelType ?? "GASOLINE"}`)}</span>
              {hub && (
                <>
                  <span className="text-[#C3C6D7]">•</span>
                  <span>{hub}</span>
                </>
              )}
              <span className="text-[#C3C6D7]">•</span>
              <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono text-[11px] font-bold text-[#2563EB]">
                {vehicle.code}
              </span>
            </div>

            {company && (
              <p className="text-xs text-[#9AA4B5]">
                {company.name} · {company.code ?? company.id}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              title={t("company.vehiclePage.soon")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Settings className="h-[18px] w-[18px] text-[#2563EB]" aria-hidden="true" />
              {t("company.vehiclePage.header.manageAvailability")}
              <span className="text-[11px] font-normal text-[#9AA4B5]">
                ({t("company.vehiclePage.header.manageAvailabilityAr")})
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/company/fleet/${vehicle.id}/edit`)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              <Edit className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("company.vehiclePage.header.editVehicle")}
              <span className="text-[11px] font-normal text-white/80">
                ({t("company.vehiclePage.header.editVehicleAr")})
              </span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#0B1C30] shadow-sm transition-colors hover:bg-[#E5EEFF] cursor-pointer"
                aria-label={t("company.vehiclePage.header.more")}
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_24px_48px_-8px_rgba(15,23,42,0.14)]">
                    {moreItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        disabled
                        title={t("company.vehiclePage.soon")}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#0B1C30] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <item.icon className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                        {t(`company.vehiclePage.header.${item.key}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!loading && vehicle.dailyPrice > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-4 text-xs text-[#9AA4B5]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <button
              type="button"
              onClick={() => navigate("/company/fleet")}
              className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              {t("company.vehiclePage.backToFleet")}
            </button>
            <span className="text-[#C3C6D7]">•</span>
            <span>
              {formatLYD(vehicle.dailyPrice)} LYD / {t("company.fleetPage.price.day")}
              {vehicle.weeklyPrice
                ? ` · ${formatLYD(vehicle.weeklyPrice)} LYD / ${t("company.fleetPage.price.weekly")}`
                : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyVehicleHeader;