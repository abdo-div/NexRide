import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Star, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import type { CompanyDirectoryEntry } from "../../types/companyDirectory";
import { companyLogoUrl } from "../../lib/vehicleMapper";

interface CompanyDirectoryCardProps {
  company: CompanyDirectoryEntry;
}

/**
 * Rich directory card: monogram, verified/top-rated badges, real rating and
 * review count, fleet capacity and up to two featured fleet previews — all
 * derived from live marketplace data.
 */
export const CompanyDirectoryCard: React.FC<CompanyDirectoryCardProps> = ({
  company,
}) => {
  const { t } = useTranslation();
  const topRated = company.reviewsCount > 0 && company.rating >= 4.5;

  return (
    <article className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      <div className="p-5 flex flex-col gap-4">
        {/* Header: monogram, name & badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {companyLogoUrl(company.logo) ? <img src={companyLogoUrl(company.logo) ?? ""} alt={company.name} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm" /> : <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm tracking-wider shadow-sm shrink-0 ${company.avatarBg}`}
            >
              {company.initials}
            </div>}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-bold text-[15px] text-slate-900 truncate">
                  {company.name}
                </h3>
                {company.isVerified && (
                  <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 truncate">
                {company.city}
              </span>
            </div>
          </div>

          {topRated ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-600 text-[11px] font-bold shrink-0">
              {t("companies.topRated")}
            </span>
          ) : company.isVerified ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold shrink-0">
              {t("companies.verified")}
            </span>
          ) : null}
        </div>

        {/* Real rating */}
        {company.reviewsCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-500">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{company.rating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">
              {t("companies.reviewsCount", { count: company.reviewsCount })}
            </span>
          </div>
        )}

        {/* Description */}
        {company.description && (
          <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-2">
            {company.description}
          </p>
        )}

        {/* Fleet capacity */}
        <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg">
          <span className="text-[10px] uppercase font-bold text-slate-500">
            {t("companies.fleetCapacity")}
          </span>
          <span
            className={`text-[13px] font-bold ${
              company.fleetSize > 0 ? "text-[#2563EB]" : "text-slate-500"
            }`}
          >
            {t("companies.availableVehicles", { count: company.fleetSize })}
          </span>
        </div>

        {/* Featured fleet previews / empty slot */}
        {company.featured.length > 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              {t("companies.featuredInFleet")}
            </span>
            {company.featured.map((vehicle) => (
              <Link
                key={vehicle.id}
                to={vehicle.href}
                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={vehicle.image}
                    alt={vehicle.title}
                    loading="lazy"
                    className="w-16 h-12 rounded-lg object-cover bg-slate-200 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-slate-900 truncate">
                      {vehicle.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {vehicle.year}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span className="text-[13px] font-bold text-[#2563EB]">
                    {vehicle.dailyPrice} {t("companies.currency")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t("companies.perDay")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center gap-1.5 min-h-[112px]">
            <Building2 className="w-6 h-6 text-slate-400" />
            <span className="text-[13px] font-bold text-slate-700">
              {t("companies.noVehiclesTitle")}
            </span>
            <p className="text-[11px] text-slate-500">
              {t("companies.noVehiclesDesc")}
            </p>
          </div>
        )}
      </div>

      {/* Card action footer */}
      <div className="p-5 pt-0">
        <Link
          to={`/companies/${encodeURIComponent(company.id)}`}
          className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 transition-colors text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>{t("companies.viewFleet")}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
    </article>
  );
};

/** Compact horizontal row used by the directory's list view. */
export const CompanyDirectoryRow: React.FC<CompanyDirectoryCardProps> = ({
  company,
}) => {
  const { t } = useTranslation();
  const topRated = company.reviewsCount > 0 && company.rating >= 4.5;

  return (
    <article className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-all duration-300 p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3 min-w-0 md:w-1/3">
        {companyLogoUrl(company.logo) ? <img src={companyLogoUrl(company.logo) ?? ""} alt={company.name} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm" /> : <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm tracking-wider shadow-sm shrink-0 ${company.avatarBg}`}
        >
          {company.initials}
        </div>}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-slate-900 truncate">{company.name}</h3>
            {company.isVerified && (
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-500 truncate">
            {company.city}
            {company.address ? ` — ${company.address}` : ""}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:flex-1 md:justify-end text-xs">
        {company.reviewsCount > 0 ? (
          <div className="flex items-center gap-1.5 font-extrabold text-amber-500 shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{company.rating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">
              {t("companies.reviewsCount", { count: company.reviewsCount })}
            </span>
          </div>
        ) : topRated ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-600 text-[11px] font-bold shrink-0">
            {t("companies.topRated")}
          </span>
        ) : null}

        <span
          className={`font-bold shrink-0 ${
            company.fleetSize > 0 ? "text-[#2563EB]" : "text-slate-500"
          }`}
        >
          {t("companies.availableVehicles", { count: company.fleetSize })}
        </span>

        <Link
          to={`/companies/${encodeURIComponent(company.id)}`}
          className="px-4 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <span>{t("companies.viewFleet")}</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </article>
  );
};

export default CompanyDirectoryCard;
