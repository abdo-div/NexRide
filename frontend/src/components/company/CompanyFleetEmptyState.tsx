import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, Warehouse } from "lucide-react";

/** Shown when the tenant-friendly fleet has no rows to register. */
export const CompanyFleetEmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#C9D2E0] bg-white px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF4FF]">
        <Warehouse className="h-8 w-8 text-[#2563EB]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[#0B1C30]">
          {t("company.fleetPage.empty.title")}{" "}
          <span className="font-semibold text-[#565E74]">
            {t("company.fleetPage.empty.titleAr")}
          </span>
        </h3>
        <p className="text-sm text-[#565E74]">{t("company.fleetPage.empty.subtitle")}</p>
      </div>
      <Link
        to="/company/fleet/new"
        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1D4ED8]"
      >
        <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("company.fleetPage.addVehicle")}
      </Link>
    </div>
  );
};

export default CompanyFleetEmptyState;