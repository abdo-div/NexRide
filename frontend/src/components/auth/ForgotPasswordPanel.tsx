import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, X, Send, CheckCircle2 } from "lucide-react";

interface ForgotPasswordPanelProps {
  onCancel: () => void;
}

export const ForgotPasswordPanel: React.FC<ForgotPasswordPanelProps> = ({
  onCancel,
}) => {
  const { t } = useTranslation();
  const [recoveryTarget, setRecoveryTarget] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-slate-100 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#2563EB] text-sm font-bold">
          <RotateCcw className="w-4 h-4" />
          <span>{t("auth.forgot.title")}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors focus:outline-none"
          aria-label="Close forgot password panel"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>

      <p className="text-sm text-slate-600">{t("auth.forgot.desc")}</p>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <RotateCcw className="absolute start-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={recoveryTarget}
            onChange={(e) => setRecoveryTarget(e.target.value)}
            placeholder={t("auth.forgot.placeholder")}
            required
            className="w-full ps-11 pe-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>{t("auth.forgot.dispatch")}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            {t("auth.forgot.cancel")}
          </button>
        </div>
      </form>

      {feedbackSent && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-[18px] h-[18px] text-emerald-600" />
          <span>{t("auth.forgot.sent")}</span>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordPanel;