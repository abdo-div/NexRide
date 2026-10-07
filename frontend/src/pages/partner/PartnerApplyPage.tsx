import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { companyApplicationApi } from "../../lib/companyApplicationApi";
import { ApiError } from "../../lib/apiClient";
import {
  buildApplicationPayload,
  mapServerFieldErrors,
  validateStep,
} from "../../lib/partnerApplicationView";
import {
  EMPTY_APPLICATION_DRAFT,
  type DocumentDraft,
  type PartnerApplicationDraft,
} from "../../types/companyApplication";
import { PartnerHero } from "../../components/partner/PartnerHero";
import { PartnerWizard } from "../../components/partner/PartnerWizard";
import { PartnerRail } from "../../components/partner/PartnerRail";

const STEP_COUNT = 6;

export const PartnerApplyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<PartnerApplicationDraft>(
    EMPTY_APPLICATION_DRAFT,
  );
  const [documents, setDocuments] = useState<DocumentDraft[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateCurrentStep = (): boolean => {
    const stepErrors = validateStep(activeStep, draft, documents, t, { agreed });
    setErrors((current) => ({ ...current, [activeStep]: stepErrors }));
    if (Object.keys(stepErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  };

  const handleContinue = (): void => {
    if (!validateCurrentStep()) return;
    setSubmitError(null);
    if (activeStep < STEP_COUNT) {
      setActiveStep((step) => step + 1);
    } else {
      void handleSubmit();
    }
  };

  const handleGoTo = (step: number): void => {
    setErrors((current) => ({ ...current, [step]: {} }));
    setActiveStep(step);
  };

  const handleBack = (): void => {
    if (activeStep > 1) setActiveStep((step) => step - 1);
  };

  /**
   * Re-runs every step's validation right before the request. The tab bar lets
   * visitors jump straight to step 6, which used to let an incomplete draft be
   * submitted to the server only to be bounced back with an opaque "invalid
   * request data" banner. Surfacing the offending steps here keeps the fixes
   * inline and prevents useless round trips.
   */
  const mergeValidationErrors = (
    serverSteps: Record<number, Record<string, string>> = {},
  ): number | null => {
    const combined: Record<number, Record<string, string>> = {};
    for (let step = 1; step <= STEP_COUNT; step += 1) {
      const stepErrors = validateStep(step, draft, documents, t, { agreed });
      if (Object.keys(stepErrors).length > 0) {
        combined[step] = { ...stepErrors, ...(serverSteps[step] ?? {}) };
      } else if (serverSteps[step]) {
        combined[step] = serverSteps[step];
      }
    }
    const stepNumbers = Object.keys(combined).map(Number).sort((a, b) => a - b);
    if (stepNumbers.length === 0) {
      setErrors((current) => ({ ...current, ...serverSteps }));
      return null;
    }
    const first = stepNumbers[0];
    setErrors((current) => ({ ...current, ...combined }));
    setSubmitError(t("partner.needFixes", { n: first }));
    setActiveStep(first);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return first;
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);

    const firstInvalid = mergeValidationErrors();
    if (firstInvalid !== null) {
      setSubmitting(false);
      return;
    }

    try {
      const payload = buildApplicationPayload(draft, documents);
      const files = documents
        .filter((doc) => doc.file)
        .map((doc) => doc.file as File);
      await companyApplicationApi.apply(payload, files);
      // The applicant is NOT signed in: a company account only becomes usable
      // after an admin approves the request, so they go back to the home page
      // as a guest instead of landing inside the company dashboard.
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        // Server-side validation: point the applicant at the exact fields in
        // their step rather than showing one generic banner per error.
        const serverSteps = mapServerFieldErrors(error.fieldErrors);
        mergeValidationErrors(serverSteps);
      } else {
        setSubmitError(
          error instanceof Error ? error.message : t("partner.formError"),
        );
        setActiveStep(6);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16">
        <PartnerHero />

        {submitError ? (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-[#BA1A1A]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">{t("partner.submitFailed")}</p>
              <p className="text-xs mt-1">{submitError}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="flex flex-col gap-5">
            <PartnerWizard
              activeStep={activeStep}
              onGoTo={handleGoTo}
              draft={draft}
              setDraft={setDraft}
              documents={documents}
              setDocuments={setDocuments}
              errors={errors}
              agreed={agreed}
              setAgreed={setAgreed}
              onBack={handleBack}
              onContinue={handleContinue}
              submitting={submitting}
            />
          </div>

          <PartnerRail activeStep={activeStep} draft={draft} />
        </div>
      </div>
    </div>
  );
};

export default PartnerApplyPage;