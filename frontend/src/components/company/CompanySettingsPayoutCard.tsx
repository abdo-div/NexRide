import React from "react";
import { useTranslation } from "react-i18next";
import { Landmark, RefreshCcw, Wallet } from "lucide-react";
import { CompanySettingsSection } from "./CompanySettingsSection";
import type { CompanySettingsPayout } from "../../types/companySettings";

interface CompanySettingsPayoutCardProps {
  commissionRate: number | null;
  payout: CompanySettingsPayout;
  dirty: boolean;
  busy: boolean;
  onChange: (field: keyof CompanySettingsPayout, value: string) => void;
  onSave: () => void;
}

const FIELDS: Array<{ key: keyof CompanySettingsPayout; labelKey: string; hintKey?: string }> = [
  { key: "bankName", labelKey: "bankName", hintKey: "bankHint" },
  { key: "accountName", labelKey: "holder" },
  { key: "iban", labelKey: "iban" },
];

/**
 * Payout & Bank Details. The platform commission override is real data
 * (customCommissionRate); the RTGS rail (bank name / IBAN / account holder) is
 * now persisted to the Company payout block via PATCH /companies/settings and
 * read back through GET. The clearance cycle itself remains a platform-level
 * setting, surfaced here as a read-only note.
 */
export const CompanySettingsPayoutCard: React.FC<CompanySettingsPayoutCardProps> = ({
  commissionRate,
  payout,
  dirty,
  busy,
  onChange,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <CompanySettingsSection
      id="settings-payout"
      title={t("company.settings.payout.title")}
      titleAr={t("company.settings.payout.titleAr")}
      description={t("company.settings.payout.explainer")}
      icon={<Landmark className="h-5 w-5" aria-hidden="true" />}
    >
      <div className="rounded-xl bg-[#F8FAFC] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0B1C30]">
                {t("company.settings.payout.commission")}
              </p>
              <p className="text-xs font-semibold text-[#565E74]">
                {commissionRate !== null && commissionRate !== undefined
                  ? t("company.settings.payout.commissionApplied", {
                      rate: commissionRate,
                    })
                  : t("company.settings.payout.commissionStandard")}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#E5EEFF] px-3 py-1 text-sm font-extrabold text-[#2563EB]">
            {commissionRate !== null && commissionRate !== undefined
              ? `${commissionRate}%`
              : "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t(`company.settings.payout.${field.labelKey}`)}
            </span>
            <input
              type="text"
              value={payout[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={t(`company.settings.payout.${field.key}Placeholder`)}
              disabled={busy}
              className="w-full rounded-xl border border-[#E5EEFF] bg-white px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF] disabled:opacity-60"
            />
            {field.hintKey && (
              <span className="mt-1 block text-[11px] text-[#9AA4B5]">
                {t(`company.settings.payout.${field.hintKey}`)}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] px-4 py-3">
        <span className="text-[11px] font-semibold text-[#565E74]">
          {t("company.settings.payout.clearance")}
        </span>
        <span className="text-[11px] font-semibold text-[#9AA4B5]">
          {t("company.settings.payout.clearanceHint")}
        </span>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || busy}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        {busy
          ? t("company.settings.payout.saving")
          : dirty
            ? t("company.settings.payout.updateBank")
            : t("company.settings.payout.saved")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsPayoutCard;