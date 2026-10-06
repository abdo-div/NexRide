import React from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellRing } from "lucide-react";
import {
  CompanySettingsSection,
  SettingRow,
  SettingToggle,
} from "./CompanySettingsSection";

interface CompanySettingsNotificationsCardProps {
  onComingSoon: () => void;
}

/**
 * Notification Preferences — unmodelled today (no per-company notification
 * channels on the model), so every channel is shown as a disabled toggle.
 */
export const CompanySettingsNotificationsCard: React.FC<CompanySettingsNotificationsCardProps> = ({
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const rows = [
    { labelKey: "newBooking", hintKey: "newBookingHint", enabled: true },
    { labelKey: "dispatches", hintKey: "dispatchesHint", enabled: true },
    { labelKey: "maintenance", hintKey: "maintenanceHint", enabled: false },
    { labelKey: "payout", hintKey: "payoutHint", enabled: true },
    { labelKey: "sms", hintKey: "smsHint", enabled: false },
    { labelKey: "weeklyEmail", hintKey: "weeklyEmailHint", enabled: true },
  ];

  return (
    <CompanySettingsSection
      id="settings-notifications"
      title={t("company.settings.notifications.title")}
      titleAr={t("company.settings.notifications.titleAr")}
      description={t("company.settings.notifications.description")}
      icon={<Bell className="h-5 w-5" aria-hidden="true" />}
      soon
    >
      <div className="divide-y divide-slate-50">
        {rows.map((row) => (
          <SettingRow
            key={row.labelKey}
            label={t(`company.settings.notifications.${row.labelKey}`)}
            hint={t(`company.settings.notifications.${row.hintKey}`)}
            soon
          >
            <SettingToggle enabled={row.enabled} />
          </SettingRow>
        ))}
      </div>
      <button
        type="button"
        onClick={onComingSoon}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
      >
        <BellRing className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.notifications.custom")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsNotificationsCard;