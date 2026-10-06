import React from "react";
import { useTranslation } from "react-i18next";
import {
  CarFront,
  HandshakeIcon,
  Headset,
  KeyRound,
  PiggyBank,
  SprayCan,
} from "lucide-react";
import { ComingSoonBadge } from "./CompanySettingsSection";

const ASPECT_ICONS = [
  CarFront,
  SprayCan,
  HandshakeIcon,
  KeyRound,
  PiggyBank,
  Headset,
] as const;

/**
 * The design's per-aspect quality scores have no dedicated backend model, so
 * this section is honestly parked as coming soon while the tenant still sees
 * the real global average from the KPI deck.
 */
export const CompanyAspectScores: React.FC = () => {
  const { t } = useTranslation();
  const aspectKeys = [
    "company.reviewsPage.aspects.items.vehicle",
    "company.reviewsPage.aspects.items.clean",
    "company.reviewsPage.aspects.items.accuracy",
    "company.reviewsPage.aspects.items.pickup",
    "company.reviewsPage.aspects.items.value",
    "company.reviewsPage.aspects.items.support",
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-bold text-[#0B1C30]">
            {t("company.reviewsPage.aspects.title")}
          </h2>
          <p className="text-[12px] font-semibold text-[#565E74]">
            {t("company.reviewsPage.aspects.titleAr")}
          </p>
        </div>
        <ComingSoonBadge />
      </header>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {aspectKeys.map((key, index) => {
          const Icon = ASPECT_ICONS[index];
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-semibold text-[#434655]">
                  {t(key)}
                </span>
              </div>
              <span className="text-[13px] font-extrabold text-[#9AA4B5]">—</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#9AA4B5]">
        <CarFront className="h-3.5 w-3.5" aria-hidden="true" />
        {t("company.reviewsPage.aspects.benchmark")} ·{" "}
        {t("company.reviewsPage.aspects.soon")}
      </p>
    </section>
  );
};

export default CompanyAspectScores;