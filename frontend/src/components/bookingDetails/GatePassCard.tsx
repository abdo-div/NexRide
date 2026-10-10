import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, QrCode } from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { formatDate } from "../../lib/bookingView";
import { PseudoQr } from "./PseudoQr";

interface GatePassCardProps {
  booking: BookingDto;
}

export const GatePassCard: React.FC<GatePassCardProps> = ({ booking }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const code = `NX-PASS-${booking._id.slice(-5).toUpperCase()}-LY`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </span>
          {t("bookingDetails.gate.title")}
        </h2>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      </div>

      <div className="flex items-center justify-center px-3 py-4 bg-[#F8FAFC] rounded-xl">
        <PseudoQr seed={booking._id} className="w-40 h-40 text-[#0F172A]" />
      </div>

      <p className="text-center text-[12px] text-[#64748B] leading-relaxed -mt-1">
        {t("bookingDetails.gate.desc")}
      </p>

      <div className="flex items-center justify-center flex-col gap-1.5">
        <span
          className="font-mono font-bold text-[15px] text-[#0F172A] tracking-[0.2em] text-center"
          dir="ltr"
        >
          {code}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
          <CalendarClock className="w-3.5 h-3.5 text-[#2563EB]" />
          {t("bookingDetails.gate.validUntil", {
            date: formatDate(booking.startDate, lang),
          })}
        </span>
      </div>
    </section>
  );
};

export default GatePassCard;