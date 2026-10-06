import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  KeyRound,
  MonitorSmartphone,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  CompanySettingsSection,
  SettingRow,
  SettingToggle,
} from "./CompanySettingsSection";
import type { CompanySettingsPasswordInput } from "../../types/companySettings";

interface CompanySettingsSecurityCardProps {
  busy: boolean;
  onUpdatePassword: (input: CompanySettingsPasswordInput) => Promise<boolean>;
  onComingSoon: () => void;
}

/**
 * Security & Sessions — password rotation is real and wired to
 * PATCH /users/update-my-password (session-scoped). Two-factor, session
 * management and account deactivation are unmodelled → coming soon.
 */
export const CompanySettingsSecurityCard: React.FC<CompanySettingsSecurityCardProps> = ({
  busy,
  onUpdatePassword,
  onComingSoon,
}) => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  const clear = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setLocalError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next.length < 8) {
      setLocalError(t("company.settings.security.passwordShort"));
      return;
    }
    if (next !== confirm) {
      setLocalError(t("company.settings.security.passwordMismatch"));
      return;
    }
    const ok = await onUpdatePassword({
      passwordCurrent: current,
      password: next,
      passwordConfirm: confirm,
    });
    if (ok) {
      clear();
    } else {
      setLocalError(t("company.settings.security.passwordFailed"));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-[#0B1C30] placeholder:text-[#A6ACBE] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20";

  return (
    <CompanySettingsSection
      id="settings-security"
      title={t("company.settings.security.title")}
      titleAr={t("company.settings.security.titleAr")}
      description={t("company.settings.security.description")}
      icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
    >
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
          <h3 className="text-sm font-extrabold text-[#0B1C30]">
            {t("company.settings.security.changePassword")}
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#565E74]">
              {t("company.settings.security.current")}
            </span>
            <input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              placeholder={t("company.settings.security.currentPh")}
              required
              dir="ltr"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#565E74]">
              {t("company.settings.security.new")}
            </span>
            <input
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              placeholder={t("company.settings.security.newPh")}
              required
              minLength={8}
              dir="ltr"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#565E74]">
              {t("company.settings.security.confirm")}
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder={t("company.settings.security.confirmPh")}
              required
              minLength={8}
              dir="ltr"
              className={inputClass}
            />
          </label>
        </div>

        {localError ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#BA1A1A]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {localError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !current || !next || !confirm}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {busy
            ? t("company.settings.saving")
            : t("company.settings.security.update")}
        </button>
      </form>

      <div className="mt-4 divide-y divide-slate-50">
        <SettingRow
          label={t("company.settings.security.twoFactor")}
          hint={t("company.settings.security.twoFactorHint")}
          soon
        >
          <SettingToggle />
        </SettingRow>
        <SettingRow
          label={t("company.settings.security.sessionsTitle")}
          hint={t("company.settings.security.sessionsHint")}
          soon
        >
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A6ACBE]">
            <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </span>
        </SettingRow>
      </div>

      <button
        type="button"
        onClick={onComingSoon}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#565E74] transition-colors hover:bg-[#E5EEFF] hover:text-[#0B1C30] cursor-pointer"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t("company.settings.security.signOutAll")}
      </button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F1D7D7] bg-[#FDF6F6] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5E3E3] text-[#BA1A1A]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#7F1D1D]">
              {t("company.settings.security.danger")}
            </p>
            <p className="text-xs font-medium text-[#9A5B5B]">
              {t("company.settings.security.dangerHint")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onComingSoon}
          className="rounded-xl border border-[#F1D7D7] bg-white px-4 py-2 text-sm font-semibold text-[#BA1A1A] transition-colors hover:bg-[#F5E3E3] cursor-pointer"
        >
          {t("company.settings.security.deactivate")}
        </button>
      </div>
    </CompanySettingsSection>
  );
};

export default CompanySettingsSecurityCard;