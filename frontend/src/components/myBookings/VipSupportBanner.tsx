import React from "react";
import { useTranslation } from "react-i18next";
import { Phone, MessageCircle } from "lucide-react";

const VIP_PHONE_LINK = "tel:+218214446397";
const VIP_PHONE_TEXT = "+218 21 444-6397";
const VIP_WHATSAPP_LINK = "https://wa.me/218214446397";

export const VipSupportBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] text-white p-8 lg:p-10 rounded-2xl shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,150 C200,80 400,220 600,140 C800,60 900,180 1000,120 L1000,300 L0,300 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-14 h-14 rounded-2xl bg-[#F97316]/30 border border-[#FDBA74]/30 flex items-center justify-center shrink-0 text-[#FED7AA]">
            <Phone className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F97316] text-white text-[11px] font-bold">
                {t("myBookings.vipBadge")}
              </span>
              <span className="text-[12px] text-[#CBD5E1]">
                {t("myBookings.vipAvailability")}
              </span>
            </div>
            <h3 className="text-[20px] font-extrabold mt-1">
              {t("myBookings.vipTitle")}
            </h3>
            <p className="text-[14px] text-[#CBD5E1] leading-relaxed">
              {t("myBookings.vipBody")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col sm:flex-row items-stretch lg:items-end gap-3 shrink-0">
          <a
            href={VIP_PHONE_LINK}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold shadow-md transition-all"
          >
            <Phone className="w-5 h-5" />
            <span className="tracking-wider" dir="ltr">
              {VIP_PHONE_TEXT}
            </span>
          </a>
          <a
            href={VIP_WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{t("myBookings.whatsappCta")}</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default VipSupportBanner;