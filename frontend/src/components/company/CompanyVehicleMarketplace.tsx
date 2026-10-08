import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Globe2 } from "lucide-react";
import { formatDate } from "../../lib/bookingView";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { SectionCard, Pill } from "./CompanyVehicleBits";

interface CompanyVehicleMarketplaceProps {
  vehicle: CompanyVehicleProfile;
  lang: string;
}

/**
 * Marketplace visibility status — the listing state, dispatch readiness and
 * registry metadata, all read from the vehicle document. "Manage Listing"
 * opens the real edit form for the vehicle profile.
 */
export const CompanyVehicleMarketplace: React.FC<CompanyVehicleMarketplaceProps> = ({
  vehicle,
  lang,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const listing = vehicle.listingStatus;
  const listingNode =
    listing === "PUBLISHED" ? (
      <Pill tone="bg-[#ECFDF5] text-[#0E6B34]">{t("company.vehiclePage.mkt.live")}</Pill>
    ) : listing === "SUSPENDED" ? (
      <Pill tone="bg-[#FFDBE0] text-[#BA1A1A]">{t("company.vehiclePage.mkt.suspended")}</Pill>
    ) : (
      <Pill tone="bg-[#F1F5F9] text-[#64748B]">{t("company.vehiclePage.mkt.draft")}</Pill>
    );

  const ready = vehicle.operationalStatus === "AVAILABLE";

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("company.vehiclePage.mkt.listing"), value: listingNode },
    {
      label: t("company.vehiclePage.mkt.readiness"),
      value: ready ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0E6B34]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0BA05F]" />
          {t("company.vehiclePage.mkt.ready")}
        </span>
      ) : (
        <span className="text-sm font-semibold text-[#8E3C00]">
          {t("company.vehiclePage.mkt.notReady")}
        </span>
      ),
    },
    {
      label: t("company.vehiclePage.mkt.registered"),
      value: vehicle.createdAt ? (
        <span className="text-sm font-semibold text-[#0B1C30]">
          {formatDate(vehicle.createdAt, lang)}
        </span>
      ) : (
        <span className="text-sm text-[#9AA4B5]">—</span>
      ),
    },
    {
      label: t("company.vehiclePage.mkt.code"),
      value: (
        <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-bold text-[#565E74]">
          {vehicle.code}
        </span>
      ),
    },
  ];

  return (
    <SectionCard
      icon={Globe2}
      iconStyle="bg-[#E5EEFF] text-[#2563EB]"
      title={t("company.vehiclePage.mkt.title")}
      titleAr={t("company.vehiclePage.mkt.titleAr")}
    >
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] py-2 last:border-0"
          >
            <span className="text-sm text-[#5C647A]">{row.label}</span>
            <span className="text-right">{row.value}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate(`/company/fleet/${vehicle.id}/edit`)}
        className="mt-4 w-full rounded-xl bg-[#F1F5F9] py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
      >
        {t("company.vehiclePage.mkt.manage")}
      </button>
    </SectionCard>
  );
};

export default CompanyVehicleMarketplace;