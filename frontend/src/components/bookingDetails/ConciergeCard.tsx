import React from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Phone, Sparkles } from "lucide-react";

const CONCIERGE_PHONE = "+218 21 444-6397";
const CONCIERGE_TEL = "tel:+218214446397";
const CONCIERGE_WHATSAPP = "https://wa.me/218214446397";

export const ConciergeCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1220] rounded-2xl p-6 text-white flex flex-col gap-4 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.45)]">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F9A825] uppercase tracking-wide">
        <Sparkles className="w-3.5 h-3.5" />
        {t("bookingDetails.concierge.label")}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-extrabold leading-snug">
          {t("bookingDetails.concierge.name")}
        </span>
        <span className="text-[12px] text-slate-400">
          {t("bookingDetails.concierge.role")}
        </span>
      </div>
      <p className="text-[12.5px] text-slate-300 leading-relaxed">
        {t("bookingDetails.concierge.body")}
      </p>
      <div className="grid grid-cols-2 gap-2.5 mt-1">
        <a
          href={CONCIERGE_TEL}
          className="inline-flex items-center justify-center gap-2 bg-white text-[#0F172A] rounded-xl py-2.5 text-[12px] font-bold hover:bg-slate-200 transition-colors"
        >
          <Phone className="w-4 h-4 text-[#2563EB]" />
          {t("bookingDetails.concierge.call")}
        </a>
        <a
          href={CONCIERGE_WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl py-2.5 text-[12px] font-bold hover:bg-emerald-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {t("bookingDetails.concierge.whatsapp")}
        </a>
      </div>
      <span
        className="text-center font-mono text-[11px] text-slate-400 tracking-widest"
        dir="ltr"
      >
        {CONCIERGE_PHONE}
      </span>
    </section>
  );
};

export default ConciergeCard;