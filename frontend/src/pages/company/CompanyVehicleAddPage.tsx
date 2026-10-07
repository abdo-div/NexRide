import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Plus,
  Save,
} from "lucide-react";
import { useCompanyVehicleAddForm } from "../../hooks/useCompanyVehicleAddForm";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { CompanyVehicleEditInfo } from "../../components/company/CompanyVehicleEditInfo";
import { CompanyVehicleEditSpecs } from "../../components/company/CompanyVehicleEditSpecs";
import {
  CompanyVehicleEditFeatures,
  CompanyVehicleEditMedia,
} from "../../components/company/CompanyVehicleEditExtras";
import { CompanyVehicleEditPricing } from "../../components/company/CompanyVehicleEditPricing";
import { CompanyVehicleEditLocation } from "../../components/company/CompanyVehicleEditLocation";
import { CompanyVehicleEditPublish } from "../../components/company/CompanyVehicleEditPublish";
import { CompanyVehicleEditPreview } from "../../components/company/CompanyVehicleEditPreview";

/** Anchor-wrapper for sticky section navigation. */
const SectionAnchor: React.FC<{ id: string; children: React.ReactNode }> = ({
  id,
  children,
}) => <div id={`section-${id}`} className="scroll-mt-32">{children}</div>;

/**
 * Add New Vehicle — full creation form for a brand-new fleet unit.
 * Reuses every existing edit-form card component. On success the user is
 * redirected to the newly created vehicle's detail page.
 */
export const CompanyVehicleAddPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCreated = useCallback(
    (vehicle: CompanyVehicleProfile) => {
      navigate(`/company/fleet/${vehicle.id}`, { replace: true });
    },
    [navigate],
  );

  const form = useCompanyVehicleAddForm(handleCreated);
  const { saving, saved, saveError, saveDraft, saveChanges } = form;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#565E74]">
            <span>Portal</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <button
              type="button"
              onClick={() => navigate("/company/fleet")}
              className="hover:text-[#2563EB] hover:underline cursor-pointer"
            >
              {t("company.fleetPage.primary")}
            </button>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[#0B1C30]">{t("company.addVehiclePage.title", "Add Vehicle")}</span>
          </div>

          {/* Hero card */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Plus className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
                  <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
                    {t("company.addVehiclePage.title", "Add New Vehicle")}
                  </h1>
                  <span className="rounded-full bg-[#FFF0E1] px-3 py-1 text-[11px] font-bold text-[#B54E00]">
                    {t("company.addVehiclePage.draft", "New Draft")}
                  </span>
                </div>
                <p className="text-sm text-[#565E74]">
                  {t(
                    "company.addVehiclePage.subtitle",
                    "Fill in all required fields, upload photos, set pricing and publish your listing.",
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/company/fleet")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#565E74] shadow-sm transition-all hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("company.addVehiclePage.back", "Back to Fleet")}
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#565E74] shadow-sm transition-all hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {t("company.addVehiclePage.saveDraft", "Save as Draft")}
                </button>
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {saving
                    ? t("company.addVehiclePage.saving", "Saving…")
                    : t("company.addVehiclePage.publish", "Publish Vehicle")}
                </button>
              </div>
            </div>

            {/* Status banners */}
            {saved && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#0E6B34]">
                <CheckCircle2 className="h-4 w-4" />
                {t("company.addVehiclePage.successMsg", "Vehicle created successfully! Redirecting…")}
              </div>
            )}
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-[#BA1A1A]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Form body ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="flex flex-col gap-6 xl:col-span-8">
            <SectionAnchor id="info">
              <CompanyVehicleEditInfo form={form} />
            </SectionAnchor>
            <SectionAnchor id="specs">
              <CompanyVehicleEditSpecs form={form} />
            </SectionAnchor>
            <SectionAnchor id="features">
              <CompanyVehicleEditFeatures />
            </SectionAnchor>
            <SectionAnchor id="media">
              <CompanyVehicleEditMedia form={form} />
            </SectionAnchor>
            <SectionAnchor id="pricing">
              <CompanyVehicleEditPricing form={form} />
            </SectionAnchor>
            <SectionAnchor id="location">
              <CompanyVehicleEditLocation form={form} />
            </SectionAnchor>
            <SectionAnchor id="publish">
              <CompanyVehicleEditPublish form={form} />
            </SectionAnchor>
          </div>

          <div className="xl:col-span-4">
            <CompanyVehicleEditPreview form={form} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyVehicleAddPage;
