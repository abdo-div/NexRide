import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
} from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { useAuth } from "../../context/useAuth";
import { FieldError, FormAlert, SubmitSpinner } from "./AuthFeedback";

interface SignInFormProps {
  onForgotPassword: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onForgotPassword }) => {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedDestination = (location.state as { from?: string } | null)?.from;
  const customerRedirect =
    requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")
      ? requestedDestination
      : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const user = await signIn({ identifier, password });
      const role = user.role.trim();
      const redirectTo =
        role === "admin" ? "/admin" : role === "company" ? "/company" : customerRedirect;
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(
          Object.fromEntries(error.fieldErrors.map(({ field, message }) => [field, message])),
        );
      } else {
        setFormError(t("auth.errors.unexpected"));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

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
              name="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t("auth.signin.identifierPlaceholder")}
              autoComplete="username"
              required
              className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#142B4A]/30 focus:border-[#142B4A] transition-all placeholder:text-slate-400"
            />
          </div>
          {fieldErrors.identifier && <FieldError>{fieldErrors.identifier}</FieldError>}
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
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
              className="text-[11px] font-semibold text-[#142B4A] hover:text-blue-700 transition-colors focus:outline-none"
            >
              {t("auth.signin.forgotPassword")}
            </button>
          </div>
          <div className="relative flex items-center">
            <Lock className="absolute start-3.5 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signin.passwordPlaceholder")}
              autoComplete="current-password"
              required
              className="w-full ps-11 pe-11 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#142B4A]/30 focus:border-[#142B4A] transition-all placeholder:text-slate-400"
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
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </div>

        {/* Remember Me & Security Level */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#142B4A]/30"
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
          disabled={isSubmitting}
          className="mt-1 w-full py-3.5 px-6 rounded-xl bg-[#142B4A] text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-[0_4px_16px_rgba(37,99,235,0.28)] flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#142B4A]"
        >
          <span>{isSubmitting ? t("auth.state.signingIn") : t("auth.signin.submit")}</span>
          {isSubmitting ? (
            <SubmitSpinner />
          ) : (
            <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          )}
        </button>
      </form>

      {/* Footer note within Sign In */}
      <p className="text-[11px] text-center text-slate-500 pt-1">
        {t("auth.signin.contactFleetDesk")}{" "}
        <a
          href="#fleet-desk"
          onClick={(e) => e.preventDefault()}
          className="text-[#142B4A] font-semibold hover:underline"
        >
          {t("auth.signin.contactFleetDeskLink")}
        </a>
      </p>
    </div>
  );
};

export default SignInForm;
