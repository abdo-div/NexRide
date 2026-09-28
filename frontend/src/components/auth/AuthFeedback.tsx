import React from "react";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

interface FormAlertProps {
  tone: "error" | "success";
  children: React.ReactNode;
}

const TONE_STYLES = {
  error: "bg-rose-50 border-rose-200 text-rose-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
} as const;

export const FormAlert: React.FC<FormAlertProps> = ({ tone, children }) => (
  <div
    role="alert"
    className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2 ${TONE_STYLES[tone]}`}
  >
    {tone === "error" ? (
      <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-px text-rose-600" />
    ) : (
      <CheckCircle2 className="w-[18px] h-[18px] shrink-0 mt-px text-emerald-600" />
    )}
    <span>{children}</span>
  </div>
);

export const FieldError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
    <span>{children}</span>
  </p>
);

export const SubmitSpinner: React.FC = () => (
  <LoaderCircle className="w-[18px] h-[18px] animate-spin" />
);
