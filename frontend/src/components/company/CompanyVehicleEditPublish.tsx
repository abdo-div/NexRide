import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, ShieldCheck } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { ComingSoonPill } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditPublishProps {
  form: CompanyVehicleEditForm;
}

const listingOptions = [
  { key: "published", value: "PUBLISHED", chip: "bg-[#ECFDF5]", dot: "bg-[#059669]", text: "text-[#0E6B34]" },
  { key: "draft", value: "DRAFT", chip: "bg-[#F1F5F9]", dot: "bg-[#94A3B8]", text: "text-[#64748B]" },
  { key: "suspended", value: "SUSPENDED", chip: "bg-[#FFF0E1]", dot: "bg-[#EA8A00]", text: "text-[#B54E00]" },
] as const;

/**
 * Card 8 — Listing status & approval governance. The segmented control writes
 * the real listingStatus (published / draft / suspended) on tap; operational
 * status stays a read-only chip. Registry compliance is coming soon.
 */
export const CompanyVehicleEditPublish: React.FC<CompanyVehicleEditPublishProps> = ({
  form,
}) => {
  const { t } = useTranslation();
  const { listingStatus, changeListingStatus, previewVehicle, fieldErrors } = form;

  return (
    <SectionCard
      icon={Globe}
      iconStyle="bg-[#E5EEFF] text-[#2563EB]"
      title={t("company.editVehiclePage.publish.title")}
      titleAr={t("company.editVehiclePage.publish.titleAr")}
      subtitle={t("company.editVehiclePage.publish.subtitle")}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {listingOptions.map((option) => {
          const active = listingStatus === option.value;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => changeListingStatus(option.value)}
              aria-pressed={active}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-4 text-left transition-all ${
                active
                  ? `${option.chip} border-transparent shadow-sm`
                  : "border-[#E5E7EB] bg-white opacity-60 hover:opacity-90"
              }`}
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${option.dot}`} aria-hidden="true" />
              <span>
                <span className={`block text-sm font-bold ${active ? option.text : "text-[#0B1C30]"}`}>
                  {t(`company.editVehiclePage.publish.${option.key}`)}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#9AA4B5]">
                  {t(`company.editVehiclePage.publish.${option.key}Hint`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {fieldErrors.listingStatus && (
        <p className="mt-2 text-[11px] font-semibold text-[#DC2626]">
          {fieldErrors.listingStatus}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#EFF4FF] px-4 py-3">
        <span className="text-xs font-bold text-[#0B1C30] dark:text-white">
          {t("company.editVehiclePage.publish.opsStatus")}{" "}
          <span className="font-normal text-[#9AA4B5]">
            ({t("company.editVehiclePage.publish.opsStatusAr")})
          </span>
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2563EB]">
          {t(`admin.status.${previewVehicle.operationalStatus}`)}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#0B1C30] dark:text-white">
                {t("company.editVehiclePage.publish.compliance")}
              </span>
              <span className="text-[11px] text-[#9AA4B5]">
                {t("company.editVehiclePage.publish.complianceHint")}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9AA4B5]">
            <ComingSoonPill>{t("company.vehiclePage.soon")}</ComingSoonPill>
          </span>
        </div>
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditPublish;