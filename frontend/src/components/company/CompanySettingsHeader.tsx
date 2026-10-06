import React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  CircleCheck,
  MapPin,
  RefreshCw,
  Save,
  Settings,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import type { CompanySettingsReadiness } from "../../types/companySettings";

interface CompanySettingsHeaderProps {
  companyName: string;
  readiness: CompanySettingsReadiness | null;
  loading: boolean;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onRefresh: () => void;
}

/**
 * "Company Settings" hero row: breadcrumb, title + Arabic pill, tenant chip,
 * refresh/save actions and the live readiness strip derived from real records.
 */
export const CompanySettingsHeader: React.FC<CompanySettingsHeaderProps> = ({
  companyName,
  readiness,
  loading,
  dirty,
  canSave,
  saving,
  onSave,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const verified = readiness?.verified ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>Portal</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("company.overview.command")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.settings.title")}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
          <Settings className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
          {t("company.settings.scopedTenant", { company: companyName })}
        </span>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.settings.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              / {t("company.settings.titleAr")}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                verified
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                  verified ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {verified
                ? t("company.settings.readiness.verified")
                : t("company.settings.readiness.pending")}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.settings.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.settings.subtitleAr")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {t("company.settings.refresh")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-[18px] w-[18px]" aria-hidden="true" />
            {saving
              ? t("company.settings.saving")
              : dirty
                ? t("company.settings.saveChanges")
                : t("company.settings.saved")}
          </button>
        </div>
      </div>

      {/* Readiness strip — all values derived from real tenant records. */}
      <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 px-5 py-4">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <CircleCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[#9AA4B5]">
              {verified
                ? t("company.settings.readiness.verified")
                : t("company.settings.readiness.pending")}
            </span>
            <span className="block text-sm font-bold text-[#0B1C30]">
              {verified ? "100%" : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 bg-[#F8FAFC] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
            <UserRoundCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[#9AA4B5]">
              {t("company.settings.readiness.profile")}
            </span>
            <span className="flex items-center gap-2">
              <span className="block text-sm font-bold text-[#0B1C30]">
                {readiness ? `${readiness.completeness}%` : "—"}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <span
                  className="block h-full rounded-full bg-[#2563EB] transition-all"
                  style={{ width: `${readiness?.completeness ?? 0}%` }}
                />
              </span>
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 bg-[#F8FAFC] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[#9AA4B5]">
              {t("company.settings.readiness.hubs")}
            </span>
            <span className="block text-sm font-bold text-[#0B1C30]">
              {readiness ? `${readiness.hubs} ${t("company.settings.readiness.active")}` : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 bg-[#F8FAFC] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[#9AA4B5]">
              {t("company.settings.readiness.fleet")}
            </span>
            <span className="block text-sm font-bold text-[#0B1C30]">
              {readiness ? `${readiness.fleet}` : "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsHeader;