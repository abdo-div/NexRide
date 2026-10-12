import React from "react";
import { Buildings, CreditCard, ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export const TrustStrip: React.FC = () => {
  const { t } = useTranslation();
  const items = [
    {
      icon: Buildings,
      title: t("home.hero.trustedSellers"),
      detail: t("home.hero.verifiedReviewed"),
    },
    {
      icon: CreditCard,
      title: t("home.hero.bestPrices"),
      detail: t("home.hero.marketCompetitive"),
    },
    {
      icon: ShieldCheck,
      title: t("home.search.freeCancellation"),
      detail: t("home.hero.carsListed"),
    },
  ];

  return (
    <section aria-label="Booking benefits" className="border-b border-slate-200 bg-white px-6 lg:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
        {items.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-center gap-3 px-2 py-5 sm:justify-center sm:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#142b4a]">
              <Icon className="h-5 w-5" weight="duotone" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-extrabold text-slate-900">{title}</strong>
              <span className="block truncate text-[11px] font-medium text-slate-500">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustStrip;
