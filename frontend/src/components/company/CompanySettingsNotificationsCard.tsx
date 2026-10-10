import React from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { CompanySettingsSection, SettingRow, SettingToggle } from "./CompanySettingsSection";
import type { CompanySettingsPreferences } from "../../types/companySettings";

type Key = keyof CompanySettingsPreferences["notifications"];
interface Props { values: CompanySettingsPreferences["notifications"]; busy: boolean; onToggle: (key: Key, value: boolean) => void; }
const rows:{labelKey:Key;hintKey:string}[]=[{labelKey:"newBooking",hintKey:"newBookingHint"},{labelKey:"dispatches",hintKey:"dispatchesHint"},{labelKey:"maintenance",hintKey:"maintenanceHint"},{labelKey:"payout",hintKey:"payoutHint"},{labelKey:"sms",hintKey:"smsHint"},{labelKey:"weeklyEmail",hintKey:"weeklyEmailHint"}];
export const CompanySettingsNotificationsCard:React.FC<Props>=({values,busy,onToggle})=>{const {t}=useTranslation();return <CompanySettingsSection id="settings-notifications" title={t("company.settings.notifications.title")} titleAr={t("company.settings.notifications.titleAr")} description={t("company.settings.notifications.description")} icon={<Bell className="h-5 w-5"/>}><div className="divide-y divide-slate-100">{rows.map((row)=><SettingRow key={row.labelKey} label={t(`company.settings.notifications.${row.labelKey}`)} hint={t(`company.settings.notifications.${row.hintKey}`)}><SettingToggle label={t(`company.settings.notifications.${row.labelKey}`)} enabled={values[row.labelKey]} disabled={busy} onChange={(value)=>onToggle(row.labelKey,value)}/></SettingRow>)}</div></CompanySettingsSection>};
export default CompanySettingsNotificationsCard;
