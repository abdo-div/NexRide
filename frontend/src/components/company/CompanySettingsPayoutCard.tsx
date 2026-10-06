import React from "react";
import { useTranslation } from "react-i18next";
import { Landmark, RefreshCcw, Wallet } from "lucide-react";
import { CompanySettingsSection, SettingRow } from "./CompanySettingsSection";

interface CompanySettingsPayoutCardProps {
  commissionRate: number | null;
  onComingSoon: () => void;
}

/**
 * Payout & Bank Details — the platform commission override is real data
 * (customCommissionRate). Bank-rail details and the clearance cycle are
 * unmodelled → coming soon.
 */
export const CompanySettingsPayoutCard: React.FC<CompanySettingsPayoutCardProps> = ({
  commissionRate,
  onComingSoon,
}) => {
  const { t } = useTranslation();

  return (
    <CompanySettingsSection
      id="settings-payout"
      title={t("company.settings.payout.title")}
      titleAr={t("company.settings.payout.titleAr")}
      description={t("company.settings.payout.description")}
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

      <div className="mt-2 divide-y divide-slate-50">
        <SettingRow
          label={t("company.settings.payout.bankName")}
          hint={t("company.settings.payout.bankHint")}
          soon
          value="—"
        />
        <SettingRow
          label={t("company.settings.payout.accountNumber")}
          soon
          value="—"
        />
        <SettingRow
          label={t("company.settings.payout.holder")}
          soon
          value="—"
        />
        <SettingRow
          label={t("company.settings.payout.iban")}
          soon
          value="—"
        />
        <SettingRow
          label={t("company.settings.payout.clearance")}
          hint={t("company.settings.payout.clearanceHint")}
          soon
          value="—"
        />
      </div>

      <button
        type="button"
        onClick={onComingSoon}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.payout.updateBank")}
      </button>
    </CompanySettingsSection>
  );
};

export default CompanySettingsPayoutCard;