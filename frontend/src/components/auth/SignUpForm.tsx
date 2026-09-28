import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  BadgeCheck,
  UserPlus,
} from "lucide-react";

type AccountType = "client" | "corporate";

export const SignUpForm: React.FC = () => {
  const { t } = useTranslation();
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [fullName, setFullName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Registration submitted! Our executive concierge will verify your credentials within 15 minutes.");
  };

  const optionClasses = (active: boolean) =>
    `flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg cursor-pointer transition-all text-xs font-semibold ${
      active
        ? "bg-white text-[#2563EB] shadow-sm"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {/* Tier Selector: Personal vs Corporate */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
        <label className={optionClasses(accountType === "client")}>
          <input
            className="sr-only"
            type="radio"
            name="account_type"
            value="client"
            checked={accountType === "client"}
            onChange={() => setAccountType("client")}
          />
          <User className="w-4 h-4" />
          <span>{t("auth.signup.client")}</span>
        </label>
        <label className={optionClasses(accountType === "corporate")}>
          <input
            className="sr-only"
            type="radio"
            name="account_type"
            value="corporate"
            checked={accountType === "corporate"}
            onChange={() => setAccountType("corporate")}
          />
          <Building2 className="w-4 h-4" />
          <span>{t("auth.signup.corporate")}</span>
        </label>
      </div>

      {/* Full Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-800">
          {t("auth.signup.fullName")}
        </label>
        <div className="relative flex items-center">
          <BadgeCheck className="absolute start-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("auth.signup.fullNamePlaceholder")}
            required
            className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Dual Contact: Email & Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-800">
            {t("auth.signup.officialEmail")}
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              placeholder={t("auth.signup.emailPlaceholder")}
              required
              className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-800">
            {t("auth.signup.mobile")}
          </label>
          <div className="relative flex items-center">
            <div className="absolute start-3 flex items-center gap-1 text-slate-800 text-xs font-bold pe-2 bg-slate-100 py-1 rounded">
              <span className="text-[12px]">🇱🇾</span>
              <span>+218</span>
            </div>
            <Phone className="absolute end-3.5 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={t("auth.signup.mobilePlaceholder")}
              required
              className="w-full ps-24 pe-11 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Passwords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-800">
            {t("auth.signup.createPassword")}
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signup.minChars")}
              required
              className="w-full ps-11 pe-11 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-800">
            {t("auth.signup.confirmPassword")}
          </label>
          <div className="relative flex items-center">
            <BadgeCheck className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.signup.confirmPlaceholder")}
              required
              className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Terms acceptance */}
      <label className="flex items-start gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          required
          className="mt-1 w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB]/30"
        />
        <span className="text-sm text-slate-600">
          {t("auth.signup.terms")}{" "}
          <a
            href="#terms"
            onClick={(e) => e.preventDefault()}
            className="text-[#2563EB] font-semibold hover:underline"
          >
            {t("auth.signup.termsLink")}
          </a>
          {t("auth.signup.termsRest")}
        </span>
      </label>

      {/* Submit Sign Up */}
      <button
        type="submit"
        className="mt-1 w-full py-3.5 px-6 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-[0_4px_16px_rgba(37,99,235,0.28)] flex items-center justify-center gap-2"
      >
        <span>{t("auth.signup.submit")}</span>
        <UserPlus className="w-[18px] h-[18px]" />
      </button>
    </form>
  );
};

export default SignUpForm;