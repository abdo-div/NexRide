import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { companyApplicationApi } from "../../lib/companyApplicationApi";
import {
  buildApplicationPayload,
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
  const { adoptSession } = useAuth();

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

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildApplicationPayload(draft, documents);
      const files = documents
        .filter((doc) => doc.file)
        .map((doc) => doc.file as File);
      const response = await companyApplicationApi.apply(payload, files);
      adoptSession(response.token, response.data.user);
      navigate("/company/application-status", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t("partner.formError"),
      );
      setActiveStep(6);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-16">
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