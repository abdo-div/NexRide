import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, CalendarCog } from "lucide-react";
import {
  CompanySettingsSection,
  SettingRow,
  SettingToggle,
} from "./CompanySettingsSection";

interface CompanySettingsBookingCardProps {
  onComingSoon: () => void;
}

/**
 * Booking & Availability Preferences — unmodelled today (no booking-preference
 * fields on the company model), so every row is an honest "coming soon" toggle.
 */
export const CompanySettingsBookingCard: React.FC<CompanySettingsBookingCardProps> = ({
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const rows = [
    { labelKey: "instant", hintKey: "instantHint" },
    { labelKey: "securityDeposit", hintKey: "securityDepositHint" },
    { labelKey: "lead", hintKey: "leadHint" },
    { labelKey: "channel", hintKey: "channelHint" },
    { labelKey: "extensions", hintKey: "extensionsHint" },
    { labelKey: "cc", hintKey: "ccHint" },
  ];

  return (
    <CompanySettingsSection
      id="settings-booking"
      title={t("company.settings.booking.title")}
      titleAr={t("company.settings.booking.titleAr")}
      description={t("company.settings.booking.description")}
      icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
      soon
    >
      <div className="divide-y divide-slate-50">
        {rows.map((row) => (
          <SettingRow
            key={row.labelKey}
            label={t(`company.settings.booking.${row.labelKey}`)}
            hint={t(`company.settings.booking.${row.hintKey}`)}
            soon
          >
            <SettingToggle />
          </SettingRow>
        ))}
      </div>
      <button
        type="button"
        onClick={onComingSoon}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
      >
        <CalendarCog className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.booking.custom")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsBookingCard;