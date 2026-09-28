import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

interface SignInFormProps {
  onForgotPassword: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onForgotPassword }) => {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Authentication authorized. Redirecting to your NexRide Executive Dispatch Portal...");
  };

  const handleGovernmentSso = () => {
    alert("Connecting securely to the Libyan Civil Registry & Electronic Passport Portal (National Digital ID SSO)...");
  };

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {/* Field: Identifier */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>{t("auth.signin.identifierLabel")}</span>
            <span className="text-[11px] font-normal text-slate-500">
              {t("auth.signin.identifierHint")}
            </span>
          </label>
          <div className="relative flex items-center">
            <AtSign className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t("auth.signin.identifierPlaceholder")}
              required
              className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Field: Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              {t("auth.signin.passwordLabel")}
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] font-semibold text-[#2563EB] hover:text-blue-700 transition-colors focus:outline-none"
            >
              {t("auth.signin.forgotPassword")}
            </button>
          </div>
          <div className="relative flex items-center">
            <Lock className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signin.passwordPlaceholder")}
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

        {/* Remember Me & Security Level */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB]/30"
            />
            <span className="text-xs text-slate-600">
              {t("auth.signin.trustDevice")}
            </span>
          </label>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>{t("auth.signin.tls")}</span>
          </div>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          className="mt-1 w-full py-3.5 px-6 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-[0_4px_16px_rgba(37,99,235,0.28)] flex items-center justify-center gap-2 group"
        >
          <span>{t("auth.signin.submit")}</span>
          <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow bg-slate-200 h-[1px]"></div>
        <span className="flex-shrink mx-4 text-[11px] uppercase tracking-wider text-slate-400">
          {t("auth.signin.divider")}
        </span>
        <div className="flex-grow bg-slate-200 h-[1px]"></div>
      </div>

      {/* SSO / Government Electronic ID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGovernmentSso}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-sm"
        >
          <BadgeCheck className="w-5 h-5 text-[#2563EB]" />
          <span className="text-xs font-semibold">{t("auth.signin.libyanPassport")}</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-xs font-semibold">{t("auth.signin.googleWorkspace")}</span>
        </button>
      </div>

      {/* Footer note within Sign In */}
      <p className="text-[11px] text-center text-slate-500 pt-1">
        {t("auth.signin.contactFleetDesk")}{" "}
        <a
          href="#fleet-desk"
          onClick={(e) => e.preventDefault()}
          className="text-[#2563EB] font-semibold hover:underline"
        >
          {t("auth.signin.contactFleetDeskLink")}
        </a>
      </p>
    </div>
  );
};

export default SignInForm;