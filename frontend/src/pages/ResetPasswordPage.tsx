import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { KeyRound, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { authApi } from "../lib/authApi";
import { useAuth } from "../context/useAuth";
import { FieldError, FormAlert, SubmitSpinner } from "../components/auth/AuthFeedback";

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setFieldErrors({ passwordConfirm: t("auth.errors.passwordMismatch") });
      return;
    }

    setFormError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { token: jwt, data } = await authApi.resetPassword({
        token,
        password,
        passwordConfirm,
      });
      adoptSession(jwt, data.user);
      navigate("/", { replace: true });
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

  if (!token) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">
            {t("auth.reset.invalidTitle")}
          </h1>
          <p className="text-sm text-slate-500 mb-6">{t("auth.reset.invalidDesc")}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            {t("auth.reset.backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  const inputClasses =
    "w-full ps-11 pe-11 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400";

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6 py-28">
      <div className="max-w-md w-full bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] border border-[#E2E8F0] p-8 md:p-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold uppercase tracking-wider mb-3">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t("auth.reset.badge")}</span>
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          {t("auth.reset.title")}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 mb-6">{t("auth.reset.subtitle")}</p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {formError && <FormAlert tone="error">{formError}</FormAlert>}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800">
              {t("auth.reset.newPassword")}
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute start-3.5 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.signup.minChars")}
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-800">
              {t("auth.reset.confirmPassword")}
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute start-3.5 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="passwordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={t("auth.signup.confirmPlaceholder")}
                autoComplete="new-password"
                required
                className={inputClasses}
              />
            </div>
            {fieldErrors.passwordConfirm && (
              <FieldError>{fieldErrors.passwordConfirm}</FieldError>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-[0_4px_16px_rgba(37,99,235,0.28)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#2563EB]"
          >
            <span>{isSubmitting ? t("auth.state.updating") : t("auth.reset.submit")}</span>
            {isSubmitting ? (
              <SubmitSpinner />
            ) : (
              <ArrowRight className="w-[18px] h-[18px] rtl:rotate-180" />
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {t("auth.reset.expiryNote")}
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
