import React from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Car, ShoppingCart } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type {
  CompanyActivityItem,
  CompanyDashboardData,
} from "../../types/companyDashboard";

interface CompanyActivityFeedProps {
  data: CompanyDashboardData;
  lang: string;
}

const KIND_CONFIG = {
  payment: {
    icon: Banknote,
    className: "bg-[#FFDBE0] text-[#BA1A1A]",
  },
  booking: {
    icon: ShoppingCart,
    className: "bg-[#DCE9FF] text-[#2563EB]",
  },
  vehicle: {
    icon: Car,
    className: "bg-[#E5EEFF] text-[#434655]",
  },
} as const;

const relativeLabel = (
  at: string,
  t: (key: string, opts?: object) => string,
): string => {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(at).getTime()) / 60000),
  );
  if (minutes < 1) return t("company.activity.justNow");
  if (minutes < 60) return t("company.activity.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("company.activity.hoursAgo", { count: hours });
  return t("company.activity.daysAgo", { count: Math.round(hours / 24) });
};

const metaLabel = (item: CompanyActivityItem, lang: string): string => {
  if (typeof item.meta !== "number") return String(item.meta);
  return `${formatLYD(item.meta)} ${lang === "ar" ? "ل.د" : "LYD"}`;
};

/** Real-time activity timeline — every row is derived from live ledger data. */
export const CompanyActivityFeed: React.FC<CompanyActivityFeedProps> = ({
  data,
  lang,
}) => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0B1C30]">{t("company.activity.title")}</h2>
            <span className="text-sm text-[#565E74]">({t("company.activity.titleAr")})</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB]">
          <span className="h-2 w-2 animate-ping rounded-full bg-[#2563EB]" />
          {t("company.activity.live")}
        </span>
      </div>

      {data.activity.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] text-center">
          <p className="text-sm font-semibold text-[#0B1C30]">{t("company.activity.empty")}</p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-4 border-s-2 border-[#E5EEFF] ps-5">
          {data.activity.map((item) => {
            const config = KIND_CONFIG[item.kind];
            const Icon = config.icon;
            return (
              <div key={item.id} className="relative flex items-start gap-3">
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${config.className}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#0B1C30]">{item.title}</span>
                  <span className="text-sm text-[#434655]">
                    {item.detail} ·{" "}
                    <span className="font-semibold text-[#2563EB]">
                      {metaLabel(item, lang)}
                    </span>
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#565E74]">
                    {relativeLabel(item.at, t as (key: string, opts?: object) => string)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CompanyActivityFeed;