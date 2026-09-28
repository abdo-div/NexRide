import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { ForgotPasswordPanel } from "./ForgotPasswordPanel";

type AuthTab = "signin" | "signup";

const TAB_HEADINGS = {
  signin: { titleKey: "auth.panel.signinTitle", subtitleKey: "auth.panel.signinSubtitle" },
  signup: { titleKey: "auth.panel.signupTitle", subtitleKey: "auth.panel.signupSubtitle" },
} as const;

export const AuthFormPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const heading = TAB_HEADINGS[activeTab];

  const tabButtonClasses = (active: boolean) =>
    `flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-center ${
      active
        ? "bg-white text-slate-800 shadow-sm"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] border border-[#E2E8F0] p-6 md:p-10">
      {/* Brand Badge and Headline */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold uppercase tracking-wider mb-3">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t("auth.panel.badge")}</span>
        </div>
        <h1 className="text-2xl md:text-[28px] font-bold text-[#0F172A] tracking-tight">
          {t(heading.titleKey)}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">{t(heading.subtitleKey)}</p>
      </div>

      {/* Switcher Segmented Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-6">
        <button
          type="button"
          className={tabButtonClasses(activeTab === "signin")}
          onClick={() => {
            setActiveTab("signin");
            setShowForgotPassword(false);
          }}
        >
          {t("auth.tabs.signIn")}
        </button>
        <button
          type="button"
          className={tabButtonClasses(activeTab === "signup")}
          onClick={() => {
            setActiveTab("signup");
            setShowForgotPassword(false);
          }}
        >
          {t("auth.tabs.createAccount")}
        </button>
      </div>

      {/* Views */}
      {showForgotPassword ? (
        <ForgotPasswordPanel onCancel={() => setShowForgotPassword(false)} />
      ) : activeTab === "signin" ? (
        <SignInForm onForgotPassword={() => setShowForgotPassword(true)} />
      ) : (
        <SignUpForm />
      )}
    </div>
  );
};

export default AuthFormPanel;