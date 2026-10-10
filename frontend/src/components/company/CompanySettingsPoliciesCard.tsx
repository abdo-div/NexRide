import React from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { CompanySettingsSection, SettingRow, SettingToggle } from "./CompanySettingsSection";
import type { CompanySettingsPreferences } from "../../types/companySettings";

type Key = keyof CompanySettingsPreferences["policies"];
interface Props { values: CompanySettingsPreferences["policies"]; busy: boolean; onToggle: (key: Key, value: boolean) => void; }
const rows: { labelKey: Key; hintKey: string }[] = [
  { labelKey:"minimumAge", hintKey:"minimumAgeHint" }, { labelKey:"allowedLicenses", hintKey:"allowedLicensesHint" },
  { labelKey:"idRequired", hintKey:"idRequiredHint" }, { labelKey:"fuel", hintKey:"fuelHint" },
  { labelKey:"km", hintKey:"kmHint" }, { labelKey:"smoking", hintKey:"smokingHint" },
];
export const CompanySettingsPoliciesCard:React.FC<Props>=({values,busy,onToggle})=>{const {t}=useTranslation();return <CompanySettingsSection id="settings-policies" title={t("company.settings.policies.title")} titleAr={t("company.settings.policies.titleAr")} description={t("company.settings.policies.description")} icon={<FileText className="h-5 w-5"/>}><div className="divide-y divide-slate-100">{rows.map((row)=><SettingRow key={row.labelKey} label={t(`company.settings.policies.${row.labelKey}`)} hint={t(`company.settings.policies.${row.hintKey}`)}><SettingToggle label={t(`company.settings.policies.${row.labelKey}`)} enabled={values[row.labelKey]} disabled={busy} onChange={(value)=>onToggle(row.labelKey,value)}/></SettingRow>)}</div></CompanySettingsSection>};
export default CompanySettingsPoliciesCard;
