import React from "react";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import type { PartnerApplicationDraft } from "../../../types/companyApplication";
import { LabeledField, TextInput } from "./inputs";

interface Props {
  draft: PartnerApplicationDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerApplicationDraft>>;
  errors: Record<string, string>;
}

export const ApplicantInfoStep: React.FC<Props> = ({ draft, setDraft, errors }) => {
  const { t } = useTranslation();
  const applicant = draft.applicant;

  const patch = (partial: Partial<PartnerApplicationDraft["applicant"]>) =>
    setDraft((current) => ({
      ...current,
      applicant: { ...current.applicant, ...partial },
    }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0B1C30]">{t("partner.step1.title")}</h3>
          <p className="text-[13px] text-[#434655]">{t("partner.step1.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledField label={t("partner.step1.name")} error={errors.name}>
          <TextInput
            value={applicant.name}
            onChange={(name) => patch({ name })}
            placeholder={t("partner.step1.namePlaceholder")}
          />
        </LabeledField>

        <LabeledField label={t("partner.step1.email")} error={errors.email}>
          <TextInput
            type="email"
            dir="ltr"
            value={applicant.email}
            onChange={(email) => patch({ email })}
            placeholder={t("partner.step1.emailPlaceholder")}
          />
        </LabeledField>

        <LabeledField label={t("partner.step1.phone")} error={errors.phoneNumber}>
          <TextInput
            type="tel"
            dir="ltr"
            value={applicant.phoneNumber}
            onChange={(phoneNumber) => patch({ phoneNumber })}
            placeholder={t("partner.step1.phonePlaceholder")}
          />
        </LabeledField>

        <div className="hidden sm:block" />

        <LabeledField
          label={t("partner.step1.password")}
          hint={t("partner.step1.passwordHint")}
          error={errors.password}
        >
          <TextInput
            type="password"
            value={applicant.password}
            onChange={(password) => patch({ password })}
          />
        </LabeledField>

        <LabeledField label={t("partner.step1.passwordConfirm")} error={errors.passwordConfirm}>
          <TextInput
            type="password"
            value={applicant.passwordConfirm}
            onChange={(passwordConfirm) => patch({ passwordConfirm })}
          />
        </LabeledField>
      </div>
    </div>
  );
};