import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { CompanySettingsSection, SettingRow, SettingToggle } from "./CompanySettingsSection";
import type { CompanySettingsPreferences } from "../../types/companySettings";

type Key = keyof CompanySettingsPreferences["booking"];
interface Props { values: CompanySettingsPreferences["booking"]; busy: boolean; onToggle: (key: Key, value: boolean) => void; }
const rows:{labelKey:Key;hintKey:string}[]=[{labelKey:"instant",hintKey:"instantHint"},{labelKey:"securityDeposit",hintKey:"securityDepositHint"},{labelKey:"lead",hintKey:"leadHint"},{labelKey:"channel",hintKey:"channelHint"},{labelKey:"extensions",hintKey:"extensionsHint"},{labelKey:"cc",hintKey:"ccHint"}];
export const CompanySettingsBookingCard:React.FC<Props>=({values,busy,onToggle})=>{const {t}=useTranslation();return <CompanySettingsSection id="settings-booking" title={t("company.settings.booking.title")} titleAr={t("company.settings.booking.titleAr")} description={t("company.settings.booking.description")} icon={<CalendarClock className="h-5 w-5"/>}><div className="divide-y divide-slate-100">{rows.map((row)=><SettingRow key={row.labelKey} label={t(`company.settings.booking.${row.labelKey}`)} hint={t(`company.settings.booking.${row.hintKey}`)}><SettingToggle label={t(`company.settings.booking.${row.labelKey}`)} enabled={values[row.labelKey]} disabled={busy} onChange={(value)=>onToggle(row.labelKey,value)}/></SettingRow>)}</div></CompanySettingsSection>};
export default CompanySettingsBookingCard;
