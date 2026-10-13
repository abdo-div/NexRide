import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, ExternalLink, MapPin, MapPinned, Phone, Save } from "lucide-react";
import { CompanySettingsSection } from "./CompanySettingsSection";
import { VehicleLocationMap } from "../maps/VehicleLocationMap";
import type { CompanyGeoPoint, CompanySettingsHub } from "../../types/companySettings";
import type { SettingsMutationResult } from "../../hooks/useCompanySettings";

interface CompanySettingsLocationsCardProps {
  hubs: CompanySettingsHub[];
  companyName: string;
  location: CompanyGeoPoint | null;
  busy: boolean;
  onSaveLocation: (location: CompanyGeoPoint) => Promise<SettingsMutationResult>;
  onComingSoon: () => void;
}

/**
 * Locations & Pickup Hubs — the hub list itself is derived live from the
 * fleet's distinct pickup locations (real data). Managing a bay, hub hours and
 * phone channels are unmodelled → coming soon.
 */
export const CompanySettingsLocationsCard: React.FC<CompanySettingsLocationsCardProps> = ({
  hubs,
  companyName,
  location,
  busy,
  onSaveLocation,
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    location?.coordinates ?? null,
  );
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const dirty = useMemo(() => {
    if (!coordinates) return false;
    return !location || coordinates[0] !== location.coordinates[0] || coordinates[1] !== location.coordinates[1];
  }, [coordinates, location]);

  const handleSave = async () => {
    if (!coordinates) return;
    setSaveState("idle");
    const result = await onSaveLocation({ type: "Point", coordinates });
    setSaveState(result.ok ? "saved" : "error");
  };

  const mapsUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`
    : "";

  return (
    <CompanySettingsSection
      id="settings-locations"
      title={t("company.settings.locations.title")}
      titleAr={t("company.settings.locations.titleAr")}
      description={t("company.settings.locations.description")}
      icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#142B4A]">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {t("company.settings.locations.liveHubs")} · {hubs.length}
        </span>
      }
    >
      <div className="mb-5 overflow-hidden rounded-2xl border border-[#DCE4EF] bg-[#F8FAFC]">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold text-[#0B1C30]">
                {t("company.settings.locations.mapTitle")}
              </p>
              {location ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {t("company.settings.locations.mapLive")}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[#64748B]">
              {t("company.settings.locations.mapDescription")}
            </p>
          </div>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              {t("company.settings.locations.openMaps")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        {!location ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-900">
            {t("company.settings.locations.noMap")}
          </div>
        ) : null}

        <div className="p-3 sm:p-4">
          <VehicleLocationMap
            coordinates={coordinates}
            editable
            label={companyName}
            onChange={(longitude, latitude) => {
              setCoordinates([longitude, latitude]);
              setSaveState("idle");
            }}
            className="h-72 sm:h-80"
            pickerHint={t("company.settings.locations.pickerHint")}
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[#64748B]" aria-live="polite">
              {saveState === "saved"
                ? t("company.settings.locations.savedPin")
                : saveState === "error"
                  ? t("company.settings.locations.saveError")
                  : coordinates
                    ? t("company.settings.locations.coordinates", {
                        latitude: coordinates[1].toFixed(6),
                        longitude: coordinates[0].toFixed(6),
                      })
                    : t("company.settings.locations.selectPin")}
            </p>
            <button
              type="button"
              disabled={!coordinates || !dirty || busy}
              onClick={() => void handleSave()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0D2039] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {busy ? t("company.settings.locations.savingPin") : t("company.settings.locations.savePin")}
            </button>
          </div>
        </div>
      </div>

      {hubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFF] px-6 py-10 text-center">
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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#142B4A]">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-[#0B1C30]">
                        {hub.name}
                      </p>
                      {hub.primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#142B4A] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
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
                  <Clock className="h-3.5 w-3.5 text-[#142B4A]" aria-hidden="true" />
                  {t("company.settings.locations.hours")}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#142B4A]">
                    {t("company.settings.soon")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <Phone className="h-3.5 w-3.5 text-[#142B4A]" aria-hidden="true" />
                  {t("company.settings.locations.phone")}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#142B4A]">
                    {t("company.settings.soon")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onComingSoon}
                className="mt-4 w-full rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#142B4A] transition-colors hover:bg-[#F1F5F9] cursor-pointer"
              >
                {t("company.settings.locations.manageBay")}
              </button>
            </div>
          ))}
        </div>
      )}

    </CompanySettingsSection>
  );
};

export default CompanySettingsLocationsCard;
