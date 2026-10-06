import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { BadgeCheck, ChevronRight, PenLine, Plus } from "lucide-react";
import type { CompanyVehicleData } from "../../types/companyVehicle";
import { categoryLabel } from "./companyFleetUi";

interface CompanyVehicleEditHeaderProps {
  data: CompanyVehicleData;
  loading: boolean;
  dirty: boolean;
}

/**
 * Breadcrumb + hero for the Edit Vehicle form. The hero leads with the real
 * vehicle identity: H1 title, listing badge, an "unsaved changes" cue while a
 * draft is pending, registry code and the Edit Mode / Add New switcher.
 */
export const CompanyVehicleEditHeader: React.FC<CompanyVehicleEditHeaderProps> = ({
  data,
  loading,
  dirty,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { vehicle, company } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#565E74]">
        <span>Portal</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <button
          type="button"
          onClick={() => navigate("/company/fleet")}
          className="hover:text-[#2563EB] hover:underline cursor-pointer"
        >
          {t("company.fleetPage.primary")}
        </button>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <button
          type="button"
          onClick={() => navigate(`/company/fleet/${vehicle.id}`)}
          className="hover:text-[#2563EB] hover:underline cursor-pointer"
        >
          {vehicle.make} {vehicle.model}
          {vehicle.year ? ` (${vehicle.year})` : ""}
        </button>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[#0B1C30]">{t("company.editVehiclePage.title")}</span>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <PenLine className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
                {t("company.editVehiclePage.title")} — {vehicle.make} {vehicle.model}
                {vehicle.year ? ` (${vehicle.year})` : ""}
              </h1>
              {!loading && (
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#0E6B34]">
                  {t(`company.editVehiclePage.badge.${vehicle.listingStatus}`)}
                </span>
              )}
              {!loading && dirty && (
                <span className="rounded-full bg-[#FFF0E1] px-3 py-1 text-[11px] font-bold text-[#B54E00]">
                  {t("company.editVehiclePage.actions.unsaved")}
                </span>
              )}
              <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-bold text-[#2563EB]">
                {vehicle.code}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#565E74]">
              <span>{categoryLabel(t, vehicle.type)}</span>
              <span className="text-[#C3C6D7]">•</span>
              <span>{t(`company.fleetPage.transmission.${vehicle.transmission ?? "AUTOMATIC"}`)}</span>
              <span className="text-[#C3C6D7]">•</span>
              <span>{t(`company.fleetPage.fuel.${vehicle.fuelType ?? "GASOLINE"}`)}</span>
              {company && (
                <>
                  <span className="text-[#C3C6D7]">•</span>
                  <span className="text-xs text-[#9AA4B5]">
                    {company.name} · {company.code ?? company.id}
                  </span>
                </>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <BadgeCheck className="h-4 w-4 text-[#0BA05F]" aria-hidden="true" />
              {t("company.editVehiclePage.editableNote")}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F7F9FC] p-1.5">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
                <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {t("company.editVehiclePage.editMode")} ({vehicle.make} {vehicle.model})
              <span className="text-[11px] font-normal text-[#9AA4B5]">
                ({t("company.editVehiclePage.editModeAr")})
              </span>
            </span>
            <button
              type="button"
              disabled
              title={t("company.vehiclePage.soon")}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#565E74] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("company.editVehiclePage.addMode")}
              <span className="text-[11px] font-normal text-[#9AA4B5]">
                ({t("company.editVehiclePage.addModeAr")})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyVehicleEditHeader;