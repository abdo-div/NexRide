import React, { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, LoaderCircle } from "lucide-react";
import type { DocumentDraft, PartnerApplicationDraft } from "../../types/companyApplication";
import { FLEET_TIERS } from "../../lib/partnerApplicationView";
import { ApplicantInfoStep } from "./steps/ApplicantInfoStep";
import { CompanyInfoStep } from "./steps/CompanyInfoStep";
import { RentalBusinessStep } from "./steps/RentalBusinessStep";
import { VerificationStep } from "./steps/VerificationStep";
import { PayoutStep } from "./steps/PayoutStep";
import { ReviewStep } from "./steps/ReviewStep";

const STEP_COUNT = 6;

const STEP_TITLE_KEYS = [
  "applicant",
  "company",
  "rental",
  "verification",
  "payouts",
  "submit",
];

interface WizardProps {
  activeStep: number;
  onGoTo: (step: number) => void;
  draft: PartnerApplicationDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerApplicationDraft>>;
  documents: DocumentDraft[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentDraft[]>>;
  errors: Record<number, Record<string, string>>;
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  submitting: boolean;
}

const stepTitles = (t: (key: string) => string, step: number): string =>
  t(`partner.steps.${STEP_TITLE_KEYS[step - 1]}`);

export const PartnerWizard: React.FC<WizardProps> = ({
  activeStep,
  onGoTo,
  draft,
  setDraft,
  documents,
  setDocuments,
  errors,
  agreed,
  setAgreed,
  onBack,
  onContinue,
  submitting,
}) => {
  const { t } = useTranslation();
  const currentErrors = errors[activeStep] ?? {};

  const summaryFor = (step: number): string => {
    switch (step) {
      case 1:
        return `${draft.applicant.name} · ${draft.applicant.email} · ${draft.applicant.phoneNumber}`;
      case 2:
        return `${draft.company.name} · ${draft.company.commercialRegisterNumber} · ${draft.company.city}`;
      case 3: {
        const tier = FLEET_TIERS.find((item) => item.value === draft.fleet.tier);
        return `${tier?.range ?? ""} ${t(`partner.step3.tiers.${draft.fleet.tier}`)} · ${draft.fleet.categories.length} categories`;
      }
      case 4:
        return `${documents.filter((doc) => doc.file).length} documents ready`;
      case 5:
        return `${draft.payout.bankName} · ${draft.payout.iban}`;
      default:
        return t("partner.rail.stepDetails.6");
    }
  };

  const renderActiveStep = (): ReactNode => {
    switch (activeStep) {
      case 1:
        return (
          <ApplicantInfoStep draft={draft} setDraft={setDraft} errors={currentErrors} />
        );
      case 2:
        return (
          <CompanyInfoStep draft={draft} setDraft={setDraft} errors={currentErrors} />
        );
      case 3:
        return (
          <RentalBusinessStep draft={draft} setDraft={setDraft} errors={currentErrors} />
        );
      case 4:
        return (
          <VerificationStep
            documents={documents}
            setDocuments={setDocuments}
            errors={currentErrors}
          />
        );
      case 5:
        return (
          <PayoutStep draft={draft} setDraft={setDraft} errors={currentErrors} />
        );
      default:
        return (
          <ReviewStep
            draft={draft}
            documents={documents}
            agreed={agreed}
            setAgreed={setAgreed}
            errors={currentErrors}
          />
        );
    }
  };

  return (
    <div className="min-w-0 flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex items-center overflow-x-auto gap-2 p-2 rounded-2xl bg-[#EFF4FF] shadow-sm">
        {Array.from({ length: STEP_COUNT }, (_, index) => index + 1).map((step) => {
          const isActive = step === activeStep;
          const isCompleted = step < activeStep;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onGoTo(step)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#434655] hover:text-[#0B1C30]"
              }`}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#2563EB]" : "bg-[#C3C6D7]"}`} />
              )}
              {t("partner.steps.label", { n: step, title: stepTitles(t, step) })}
            </button>
          );
        })}
      </div>

      {/* Step blocks */}
      {Array.from({ length: STEP_COUNT }, (_, index) => index + 1).map((step) => {
        if (step === activeStep) {
          return (
            <div
              key={step}
              className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between pb-1 gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DBE1FF] text-[#00174B] text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  {t("partner.steps.active")}
                </span>
                <span className="text-[10px] text-[#737686] uppercase font-bold tracking-wider">
                  {t("partner.steps.config", { step })}
                </span>
              </div>
              {renderActiveStep()}
            </div>
          );
        }

        const isCompleted = step < activeStep;
        return (
          <div
            key={step}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4 bg-[#EFF4FF]/60">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? "bg-[#D3E4FE] text-[#2563EB]"
                      : "bg-[#E5EEFF] text-[#434655] font-bold text-[13px]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 font-extrabold" />
                  ) : (
                    step
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0B1C30]">
                      {t("partner.steps.label", { n: step, title: stepTitles(t, step) })}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        isCompleted
                          ? "bg-[#DAE2FD] text-[#3F465C]"
                          : "text-[#737686]"
                      }`}
                    >
                      {isCompleted
                        ? t("partner.steps.completed")
                        : t("partner.steps.upcoming")}
                    </span>
                  </div>
                  <span className="text-xs text-[#434655] block truncate">
                    {isCompleted ? summaryFor(step) : t(`partner.rail.stepDetails.${step}`)}
                  </span>
                </div>
              </div>

              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => onGoTo(step)}
                  className="text-sm font-bold text-[#2563EB] flex items-center gap-1 hover:underline shrink-0 cursor-pointer"
                >
                  {t("partner.steps.edit")}
                </button>
              ) : (
                <span className="w-16 shrink-0" />
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom action toolbar */}
      <div className="p-5 bg-white rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={activeStep === 1}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#EFF4FF] text-[#0B1C30] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#E5EEFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="rtl:rotate-180">←</span>
          {activeStep === 1
            ? t("partner.toolbar.backStart")
            : t("partner.toolbar.back", { n: activeStep - 1 })}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[#434655]">
          {submitting ? (
            <LoaderCircle className="w-4 h-4 animate-spin text-[#2563EB]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#737686]" />
          )}
          <span>{t("partner.toolbar.autoSaved", { time: "just now" })}</span>
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-[#2563EB]/25 transition-all hover:bg-[#004AC6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {activeStep === STEP_COUNT
            ? t("partner.step6.submit")
            : t("partner.toolbar.continueTo", { n: activeStep + 1 })}
          <span className="rtl:rotate-180">→</span>
        </button>
      </div>
    </div>
  );
};

export default PartnerWizard;
