import React from "react";
import { useTranslation } from "react-i18next";
import { Landmark, CalendarClock } from "lucide-react";
import type { PartnerApplicationDraft } from "../../../types/companyApplication";
import { LabeledField, TextInput } from "./inputs";

interface Props {
  draft: PartnerApplicationDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerApplicationDraft>>;
  errors: Record<string, string>;
}

export const PayoutStep: React.FC<Props> = ({ draft, setDraft, errors }) => {
  const { t } = useTranslation();
  const payout = draft.payout;

  const patch = (partial: Partial<PartnerApplicationDraft["payout"]>) =>
    setDraft((current) => ({
      ...current,
      payout: { ...current.payout, ...partial },
    }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step5.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step5.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField label={t("partner.step5.bankName")} error={errors.bankName}>
          <TextInput
            value={payout.bankName}
            onChange={(bankName) => patch({ bankName })}
            placeholder={t("partner.step5.bankNamePlaceholder")}
          />
        </LabeledField>

        <LabeledField label={t("partner.step5.iban")} error={errors.iban}>
          <TextInput
            dir="ltr"
            value={payout.iban}
            onChange={(iban) => patch({ iban })}
            placeholder={t("partner.step5.ibanPlaceholder")}
          />
        </LabeledField>

        <div className="sm:col-span-2">
          <LabeledField label={t("partner.step5.accountName")} error={errors.accountName}>
            <TextInput
              value={payout.accountName}
              onChange={(accountName) => patch({ accountName })}
              placeholder={t("partner.step5.accountNamePlaceholder")}
            />
          </LabeledField>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#EFF4FF] flex items-start gap-2.5">
        <CalendarClock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <p className="text-xs text-[#434655] leading-relaxed">{t("partner.step5.note")}</p>
      </div>
    </div>
  );
};