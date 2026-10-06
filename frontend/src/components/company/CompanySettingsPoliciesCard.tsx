import React from "react";
import { useTranslation } from "react-i18next";
import { FileCog, FileText } from "lucide-react";
import {
  CompanySettingsSection,
  SettingRow,
  SettingToggle,
} from "./CompanySettingsSection";

interface CompanySettingsPoliciesCardProps {
  onComingSoon: () => void;
}

/**
 * Rental Policies — every policy row is unmodelled today (no policy fields on
 * the company model), so each one is shown as a disabled, honest "coming soon"
 * row instead of fabricating stored values.
 */
export const CompanySettingsPoliciesCard: React.FC<CompanySettingsPoliciesCardProps> = ({
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const rows = [
    { labelKey: "minimumAge", hintKey: "minimumAgeHint" },
    { labelKey: "allowedLicenses", hintKey: "allowedLicensesHint" },
    { labelKey: "idRequired", hintKey: "idRequiredHint" },
    { labelKey: "fuel", hintKey: "fuelHint" },
    { labelKey: "km", hintKey: "kmHint" },
    { labelKey: "smoking", hintKey: "smokingHint" },
  ];

  return (
    <CompanySettingsSection
      id="settings-policies"
      title={t("company.settings.policies.title")}
      titleAr={t("company.settings.policies.titleAr")}
      description={t("company.settings.policies.description")}
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      soon
    >
      <div className="divide-y divide-slate-50">
        {rows.map((row) => (
          <SettingRow
            key={row.labelKey}
            label={t(`company.settings.policies.${row.labelKey}`)}
            hint={t(`company.settings.policies.${row.hintKey}`)}
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
        <FileCog className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.policies.customize")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsPoliciesCard;