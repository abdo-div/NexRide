import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRight, Users, Car, Wallet, BadgeCheck, Activity } from "lucide-react";

export const PartnerHero: React.FC = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      title: t("partner.benefits.reach.title"),
      desc: t("partner.benefits.reach.desc"),
      icon: Users,
      tile: "bg-[#E5EEFF] text-[#004AC6]",
    },
    {
      title: t("partner.benefits.manage.title"),
      desc: t("partner.benefits.manage.desc"),
      icon: Car,
      tile: "bg-[#DAE2FD] text-[#2563EB]",
    },
    {
      title: t("partner.benefits.payouts.title"),
      desc: t("partner.benefits.payouts.desc"),
      icon: Wallet,
      tile: "bg-[#FFDBCA] text-[#8E3C00]",
    },
  ];

  return (
    <>
      <section className="w-full bg-[#EFF4FF] px-6 lg:px-12 pt-8 pb-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <nav className="flex items-center gap-1 text-xs font-semibold text-[#434655]" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#004AC6] transition-colors">
              {t("partner.breadcrumb.home")}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#737686] rtl:rotate-180" />
            <Link to="/#fleet-operators" className="hover:text-[#004AC6] transition-colors">
              {t("partner.breadcrumb.becomePartner")}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#737686] rtl:rotate-180" />
            <span className="text-[#004AC6] font-bold">
              {t("partner.breadcrumb.application")}
            </span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-1">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D3E4FE] text-[#004AC6] text-[11px] uppercase tracking-wider font-bold mb-1.5">
                <Activity className="w-3 h-3" />
                {t("partner.hero.badge")}
              </div>
              <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-[#0B1C30]">
                {t("partner.hero.title")}{" "}
                <span className="text-lg sm:text-xl text-[#565E74] font-semibold block sm:inline sm:ms-3">
                  {t("partner.hero.titleAr")}
                </span>
              </h1>
              <p className="text-sm text-[#434655] max-w-2xl mt-1.5 leading-relaxed">
                {t("partner.hero.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#434655] bg-white px-4 py-2.5 rounded-xl shadow-sm self-start md:self-auto">
              <BadgeCheck className="w-[18px] h-[18px] text-[#004AC6]" />
              <span>{t("partner.hero.registry")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-6 lg:px-12 mt-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${benefit.tile}`}
              >
                <benefit.icon className="w-[26px] h-[26px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#0B1C30]">
                  {benefit.title}
                </h2>
                <p className="text-[13px] text-[#434655] mt-0.5 leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};