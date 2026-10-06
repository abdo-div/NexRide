import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, MapPinned, Phone, Clock, Plus } from "lucide-react";
import { CompanySettingsSection } from "./CompanySettingsSection";
import type { CompanySettingsHub } from "../../types/companySettings";

interface CompanySettingsLocationsCardProps {
  hubs: CompanySettingsHub[];
  onComingSoon: () => void;
}

/**
 * Locations & Pickup Hubs — the hub list itself is derived live from the
 * fleet's distinct pickup locations (real data). Managing a bay, hub hours and
 * phone channels are unmodelled → coming soon.
 */
export const CompanySettingsLocationsCard: React.FC<CompanySettingsLocationsCardProps> = ({
  hubs,
  onComingSoon,
}) => {
  const { t } = useTranslation();

  return (
    <CompanySettingsSection
      id="settings-locations"
      title={t("company.settings.locations.title")}
      titleAr={t("company.settings.locations.titleAr")}
      description={t("company.settings.locations.description")}
      icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EEFF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {t("company.settings.locations.liveHubs")} · {hubs.length}
        </span>
      }
    >
      {hubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D3E4FE] bg-[#F8FAFF] px-6 py-10 text-center">
          <MapPin className="h-7 w-7 text-[#94A3B8]" aria-hidden="true" />
          <p className="mt-3 max-w-sm text-xs font-semibold leading-relaxed text-[#64748B]">
            {t("company.settings.locations.noHubs")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {hubs.map((hub) => (
            <div
              key={hub.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-[#0B1C30]">
                        {hub.name}
                      </p>
                      {hub.primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                          {t("company.settings.locations.primary")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs font-semibold text-[#565E74]">
                      {hub.city}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {t("company.settings.locations.assignedVehicles", {
                    count: hub.vehicles,
                  })}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <Clock className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
                  {t("company.settings.locations.hours")}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                    {t("company.settings.soon")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <Phone className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
                  {t("company.settings.locations.phone")}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                    {t("company.settings.soon")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onComingSoon}
                className="mt-4 w-full rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
              >
                {t("company.settings.locations.manageBay")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[#D3E4FE] bg-[#F8FAFF] px-4 py-3">
        <Plus className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
        <input
          type="text"
          disabled
          placeholder={t("company.settings.locations.addLocationPh")}
          className="w-full bg-transparent text-sm font-medium text-[#A6ACBE] placeholder:text-[#A6ACBE] focus:outline-none"
        />
        <button
          type="button"
          onClick={onComingSoon}
          className="shrink-0 rounded-xl bg-[#EFF4FF] px-3 py-1.5 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
        >
          {t("company.settings.locations.addLocation")}
        </button>
      </div>
    </CompanySettingsSection>
  );
};

export default CompanySettingsLocationsCard;