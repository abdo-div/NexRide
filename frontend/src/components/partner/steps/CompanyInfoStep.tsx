import React from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import type { PartnerApplicationDraft } from "../../../types/companyApplication";
import { LabeledField, TextInput } from "./inputs";

interface Props {
  draft: PartnerApplicationDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerApplicationDraft>>;
  errors: Record<string, string>;
}

export const CompanyInfoStep: React.FC<Props> = ({ draft, setDraft, errors }) => {
  const { t } = useTranslation();
  const company = draft.company;

  const patch = (partial: Partial<PartnerApplicationDraft["company"]>) =>
    setDraft((current) => ({
      ...current,
      company: { ...current.company, ...partial },
    }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step2.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step2.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <LabeledField label={t("partner.step2.companyName")} error={errors.companyName}>
            <TextInput
              value={company.name}
              onChange={(name) => patch({ name })}
              placeholder={t("partner.step2.companyNamePlaceholder")}
            />
          </LabeledField>
        </div>

        <LabeledField
          label={t("partner.step2.crNumber")}
          error={errors.commercialRegisterNumber}
        >
          <TextInput
            dir="ltr"
            value={company.commercialRegisterNumber}
            onChange={(commercialRegisterNumber) => patch({ commercialRegisterNumber })}
            placeholder={t("partner.step2.crNumberPlaceholder")}
          />
        </LabeledField>

        <LabeledField label={t("partner.step2.city")} error={errors.city}>
          <TextInput
            value={company.city}
            onChange={(city) => patch({ city })}
            placeholder={t("partner.step2.cityPlaceholder")}
          />
        </LabeledField>

        <div className="sm:col-span-2">
          <LabeledField label={t("partner.step2.address")} error={errors.address}>
            <TextInput
              value={company.address}
              onChange={(address) => patch({ address })}
              placeholder={t("partner.step2.addressPlaceholder")}
            />
          </LabeledField>
        </div>
      </div>
    </div>
  );
};