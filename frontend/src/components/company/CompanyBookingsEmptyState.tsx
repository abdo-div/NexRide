import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";

/**
 * Rendered whenever the register has no rows for the current filter (and also
 * stands in for the very first load with zero bookings). Mirrors the design's
 * empty state copy so the tenant knows the ledger is genuinely empty and not
 * just filtered out of view.
 */
export const CompanyBookingsEmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#E5EEFF] bg-white text-center px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#2563EB]">
        <CalendarClock className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
          {t("company.bookingsPage.empty.title")}{" "}
          <span className="font-semibold text-[#565E74]">
            {t("company.bookingsPage.empty.titleAr")}
          </span>
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#565E74]">
          {t("company.bookingsPage.empty.body")}
        </p>
        <p className="text-sm leading-relaxed text-[#9AA4B5]">
          {t("company.bookingsPage.empty.bodyAr")}
        </p>
      </div>
    </div>
  );
};

export default CompanyBookingsEmptyState;