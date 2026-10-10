import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon } from "lucide-react";
import { useCompanySettings } from "../../hooks/useCompanySettings";
import { CompanySettingsHeader } from "../../components/company/CompanySettingsHeader";
import { CompanySettingsNav } from "../../components/company/CompanySettingsNav";
import { CompanySettingsProfileCard } from "../../components/company/CompanySettingsProfileCard";
import { CompanySettingsBusinessCard } from "../../components/company/CompanySettingsBusinessCard";
import { CompanySettingsLocationsCard } from "../../components/company/CompanySettingsLocationsCard";
import { CompanySettingsPoliciesCard } from "../../components/company/CompanySettingsPoliciesCard";
import { CompanySettingsBookingCard } from "../../components/company/CompanySettingsBookingCard";
import { CompanySettingsNotificationsCard } from "../../components/company/CompanySettingsNotificationsCard";
import { CompanySettingsPayoutCard } from "../../components/company/CompanySettingsPayoutCard";
import { CompanySettingsSecurityCard } from "../../components/company/CompanySettingsSecurityCard";
import type {
  CompanySettingsPasswordInput,
  CompanySettingsPayout,
  CompanySettingsPreferences,
} from "../../types/companySettings";

/**
 * Company Settings — a sticky left rail over eight section cards. Profile and
 * security (password) are real tenant-scoped surfaces. Payout & Bank now
 * persists the RTGS rail via PATCH /settings; every other design-mock control
 * is rendered as an honest, disabled "coming soon" row.
 */
export const CompanySettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    draft,
    payoutDraft,
    loading,
    error,
    busy,
    dirty,
    canSave,
    payoutDirty,
    reload,
    updateDraft,
    updatePayoutDraft,
    saveProfile,
    savePayout,
    saveLogo,
    saveCover,
    savePreferences,
    changePassword,
  } = useCompanySettings();

  const [active, setActive] = useState("settings-profile");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const handleSave = async () => {
    const result = await saveProfile();
    showToast(
      result.ok
        ? t("company.settings.toasts.saved")
        : result.message || t("company.settings.toasts.savedError"),
    );
  };

  const handleSavePayout = async () => {
    const result = await savePayout();
    showToast(
      result.ok
        ? t("company.settings.payout.savedToast")
        : result.message || t("company.settings.toasts.savedError"),
    );
  };

  const handlePassword = async (
    input: CompanySettingsPasswordInput,
  ): Promise<boolean> => {
    const result = await changePassword(input);
    showToast(
      result.ok
        ? t("company.settings.security.passwordUpdated")
        : result.message || t("company.settings.toasts.savedError"),
    );
    return result.ok;
  };

  const notifyComingSoon = () => showToast(t("company.settings.soonMessage"));

  const handleLogo = async (file: File) => {
    const result = await saveLogo(file);
    showToast(result.ok ? t("company.settings.profile.logoSaved") : result.message || t("company.settings.toasts.savedError"));
  };

  const handleCover = async (file: File) => {
    const result = await saveCover(file);
    showToast(result.ok ? (t("company.settings.profile.coverSaved", { defaultValue: "Company cover updated." })) : result.message || t("company.settings.toasts.savedError"));
  };

  const handlePreference = async <S extends keyof CompanySettingsPreferences>(section: S, key: keyof CompanySettingsPreferences[S], value: boolean) => {
    if (!data) return;
    const preferences = {
      ...data.profile.settingsPreferences,
      [section]: { ...data.profile.settingsPreferences[section], [key]: value },
    } as CompanySettingsPreferences;
    const result = await savePreferences(preferences);
    showToast(result.ok ? t("company.settings.toasts.saved") : result.message || t("company.settings.toasts.savedError"));
  };

  const scrollToSection = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const companyName = data?.profile.name ?? "Your company";
  const subdomain = data?.profile.subdomain ?? "";
  const city = data?.profile.city ?? "";
  const verified = data?.readiness.verified ?? false;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanySettingsHeader
          companyName={companyName}
          readiness={data?.readiness ?? null}
          loading={loading}
          dirty={dirty}
          canSave={canSave}
          saving={busy}
          onSave={() => void handleSave()}
          onRefresh={reload}
        />

        {error ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <SettingsIcon className="h-10 w-10 text-[#94A3B8]" aria-hidden="true" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.settings.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.settings.retry")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 items-start gap-6">
            {/* Sticky left rail */}
            <aside className="col-span-12 lg:sticky lg:top-6 lg:col-span-4 xl:col-span-3">
              {loading ? (
                <div className="space-y-4">
                  <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                  <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                </div>
              ) : (
                  <CompanySettingsNav
                  companyName={companyName}
                  subdomain={subdomain}
                  city={city}
                  verified={verified}
                  logo={data?.profile.logo ?? ""}
                  active={active}
                  onSelect={scrollToSection}
                  onComingSoon={notifyComingSoon}
                />
              )}
            </aside>

            {/* Section cards */}
            <div className="col-span-12 space-y-6 lg:col-span-8 xl:col-span-9">
              {loading ? (
                <div className="space-y-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                  ))}
                </div>
              ) : data ? (
                <>
                  <CompanySettingsProfileCard
                    draft={draft}
                    subdomain={subdomain}
                    onChange={updateDraft}
                    busy={busy}
                    onLogoChange={(file) => void handleLogo(file)}
                    onCoverChange={(file) => void handleCover(file)}
                  />
                  <CompanySettingsBusinessCard
                    profile={data.profile}
                    onComingSoon={notifyComingSoon}
                  />
                  <CompanySettingsLocationsCard
                    hubs={data.hubs}
                    onComingSoon={notifyComingSoon}
                  />
                  <CompanySettingsPoliciesCard values={data.profile.settingsPreferences.policies} busy={busy} onToggle={(key, value) => void handlePreference("policies", key, value)} />
                  <CompanySettingsBookingCard values={data.profile.settingsPreferences.booking} busy={busy} onToggle={(key, value) => void handlePreference("booking", key, value)} />
                  <CompanySettingsNotificationsCard values={data.profile.settingsPreferences.notifications} busy={busy} onToggle={(key, value) => void handlePreference("notifications", key, value)} />
                  <CompanySettingsPayoutCard
                    commissionRate={data.profile.customCommissionRate}
                    payout={payoutDraft}
                    dirty={payoutDirty}
                    busy={busy}
                    onChange={(field, value) =>
                      updatePayoutDraft(field as keyof CompanySettingsPayout, value)
                    }
                    onSave={() => void handleSavePayout()}
                  />
                  <CompanySettingsSecurityCard
                    busy={busy}
                    onUpdatePassword={handlePassword}
                    onComingSoon={notifyComingSoon}
                  />
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Local toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default CompanySettingsPage;
