import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { PenLine } from "lucide-react";
import { useCompanyVehicle } from "../../hooks/useCompanyVehicle";
import { useCompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { CompanyVehicleEditHeader } from "../../components/company/CompanyVehicleEditHeader";
import { CompanyVehicleEditAnchors } from "../../components/company/CompanyVehicleEditAnchors";
import { CompanyVehicleEditInfo } from "../../components/company/CompanyVehicleEditInfo";
import { CompanyVehicleEditSpecs } from "../../components/company/CompanyVehicleEditSpecs";
import {
  CompanyVehicleEditFeatures,
  CompanyVehicleEditMedia,
} from "../../components/company/CompanyVehicleEditExtras";
import { CompanyVehicleEditPricing } from "../../components/company/CompanyVehicleEditPricing";
import { CompanyVehicleEditLocation } from "../../components/company/CompanyVehicleEditLocation";
import { CompanyVehicleEditPolicies } from "../../components/company/CompanyVehicleEditPolicies";
import { CompanyVehicleEditPublish } from "../../components/company/CompanyVehicleEditPublish";
import { CompanyVehicleEditPreview } from "../../components/company/CompanyVehicleEditPreview";

/** Anchor-wrapper for the sticky section nav (mirrors the mock's grouped cards). */
const SectionAnchor: React.FC<{ id: string; children: React.ReactNode }> = ({
  id,
  children,
}) => <div id={`section-${id}`} className="scroll-mt-32">{children}</div>;

const CardSkeleton: React.FC = () => (
  <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
);

/**
 * Edit Vehicle — editable form over one fleet unit's real attributes. Every
 * field starts from the tenant-scoped dossier; only genuinely changed fields
 * are patched to PATCH /cars/:id, then the dossier refetches and the form
 * reseeds. Non-modelled cards stay clearly marked "coming soon".
 */
export const CompanyVehicleEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { vehicleId } = useParams<{ vehicleId: string }>();

  const { data, loading, error, reload } = useCompanyVehicle(vehicleId ?? "");

  const { vehicle } = data;
  const form = useCompanyVehicleEditForm(vehicle, reload);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-5">
        <CompanyVehicleEditHeader data={data} loading={loading} dirty={form.dirty} />
        <CompanyVehicleEditAnchors />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex flex-col gap-6 xl:col-span-8">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="flex flex-col gap-6 xl:col-span-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        ) : error ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <PenLine className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.editVehiclePage.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.overview.retry")}
            </button>
          </div>
        ) : (
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
              <SectionAnchor id="policies">
                <CompanyVehicleEditPolicies />
              </SectionAnchor>
              <SectionAnchor id="publish">
                <CompanyVehicleEditPublish form={form} />
              </SectionAnchor>
            </div>

            <div className="xl:col-span-4">
              <CompanyVehicleEditPreview form={form} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyVehicleEditPage;