import React from "react";
import { useTranslation } from "react-i18next";
import {
  Award,
  Building2,
  CloudUpload,
} from "lucide-react";
import { CompanySettingsSection } from "./CompanySettingsSection";
import type {
  CompanySettingsProfile,
  EditableCompanyField,
} from "../../types/companySettings";

interface InputFieldProps {
  label: string;
  required?: boolean;
  soon?: boolean;
  value: string;
  placeholder: string;
  disabled?: boolean;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
  onChange?: (value: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  required,
  soon,
  value,
  placeholder,
  disabled,
  multiline,
  dir,
  onChange,
}) => {
  const { t } = useTranslation();
  const shared = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-[#0B1C30] placeholder:text-[#A6ACBE] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#A6ACBE]";
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#565E74]">
        {label}
        {required ? <span className="text-[#BA1A1A]">*</span> : null}
        {soon ? (
          <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
            {t("company.settings.soon")}
          </span>
        ) : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          rows={4}
          dir={dir}
          className={`${shared} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          dir={dir}
          className={shared}
        />
      )}
    </label>
  );
};

interface CompanySettingsProfileCardProps {
  draft: CompanySettingsProfile;
  subdomain: string;
  onChange: (field: EditableCompanyField, value: string) => void;
}

/**
 * Company Profile — the only section with real editable fields today (name,
 * description, email, phone, city, address), wired to PATCH /companies/settings.
 * Arabic name, website, Instagram and logo upload are unmodelled → coming soon.
 */
export const CompanySettingsProfileCard: React.FC<CompanySettingsProfileCardProps> = ({
  draft,
  subdomain,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <CompanySettingsSection
      id="settings-profile"
      title={t("company.settings.profile.title")}
      titleAr={t("company.settings.profile.titleAr")}
      description={t("company.settings.profile.description")}
      icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
          label={t("company.settings.profile.brandName")}
          required
          value={draft.name}
          placeholder={t("company.settings.profile.brandNamePh")}
          onChange={(value) => onChange("name", value)}
        />
        <InputField
          label={t("company.settings.profile.arabicName")}
          soon
          value=""
          placeholder={t("company.settings.profile.arabicNamePh")}
          disabled
          dir="rtl"
        />
        <InputField
          label={t("company.settings.profile.phone")}
          required
          value={draft.phone}
          placeholder={t("company.settings.profile.phonePh")}
          onChange={(value) => onChange("phone", value)}
          dir="ltr"
        />
        <InputField
          label={t("company.settings.profile.email")}
          required
          value={draft.email}
          placeholder={t("company.settings.profile.emailPh")}
          onChange={(value) => onChange("email", value)}
          dir="ltr"
        />
        <InputField
          label={t("company.settings.profile.city")}
          required
          value={draft.city}
          placeholder={t("company.settings.profile.cityPh")}
          onChange={(value) => onChange("city", value)}
        />
        <InputField
          label={t("company.settings.profile.address")}
          required
          value={draft.address}
          placeholder={t("company.settings.profile.addressPh")}
          onChange={(value) => onChange("address", value)}
        />
        <InputField
          label={t("company.settings.profile.subdomain")}
          value={`@${subdomain || "partner"}`}
          placeholder={`@${subdomain || "partner"}`}
          disabled
        />
        <div className="flex items-end">
          <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-dashed border-[#D3E4FE] bg-[#F8FAFF] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-extrabold text-white">
                {draft.name.charAt(0).toUpperCase() || "N"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0B1C30]">
                  {t("company.settings.profile.logo")}
                </p>
                <p className="truncate text-[11px] font-medium text-[#9AA4B5]">
                  {t("company.settings.profile.logoHint")}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
              <CloudUpload className="h-3 w-3" aria-hidden="true" />
              {t("company.settings.soon")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <InputField
          label={t("company.settings.profile.about")}
          value={draft.description}
          placeholder={t("company.settings.profile.aboutPh")}
          multiline
          onChange={(value) => onChange("description", value)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative">
          <InputField
            label={t("company.settings.profile.website")}
            soon
            value=""
            placeholder={t("company.settings.profile.websitePh")}
            disabled
          />
        </div>
        <div className="relative">
          <InputField
            label={t("company.settings.profile.instagram")}
            soon
            value=""
            placeholder={t("company.settings.profile.instagramPh")}
            disabled
          />
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-[#9AA4B5]">
        <Award className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
        {t("company.settings.profile.hintSync")}
      </p>
    </CompanySettingsSection>
  );
};

export default CompanySettingsProfileCard;