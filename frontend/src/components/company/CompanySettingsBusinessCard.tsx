import React from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, FileClock, Landmark, Scale } from "lucide-react";
import { CompanySettingsSection, SettingRow } from "./CompanySettingsSection";
import type { CompanySettingsProfile } from "../../types/companySettings";

interface CompanySettingsBusinessCardProps {
  profile: CompanySettingsProfile;
  onComingSoon: () => void;
}

/**
 * Legal & Business Registration — verified identity data is real (company
 * name, commercial register number, registered city), while operating-license
 * and tax bookings are unmodelled → coming soon.
 */
export const CompanySettingsBusinessCard: React.FC<CompanySettingsBusinessCardProps> = ({
  profile,
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const verified = profile.status === "APPROVED";

  return (
    <CompanySettingsSection
      id="settings-legal"
      title={t("company.settings.business.title")}
      titleAr={t("company.settings.business.titleAr")}
      description={t("company.settings.business.description")}
      icon={<Scale className="h-5 w-5" aria-hidden="true" />}
      action={
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {verified
            ? t("company.settings.business.verified")
            : t("company.settings.business.notVerified")}
        </span>
      }
    >
      <div className="rounded-xl bg-[#F8FAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0B1C30]">
                {profile.name || "—"}
              </p>
              <p className="truncate text-xs font-semibold text-[#565E74]">
                {profile.city ? `${profile.city} · ${profile.address}` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <SettingRow
          label={t("company.settings.business.register")}
          value={profile.commercialRegisterNumber || "—"}
        />
        <SettingRow
          label={t("company.settings.business.license")}
          hint={t("company.settings.business.licenseHint")}
          soon
          value="—"
        />
        <SettingRow
          label={t("company.settings.business.tax")}
          hint={t("company.settings.business.taxHint")}
          soon
          value="—"
        />
      </div>

      <button
        type="button"
        onClick={onComingSoon}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
      >
        <FileClock className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.business.review")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsBusinessCard;