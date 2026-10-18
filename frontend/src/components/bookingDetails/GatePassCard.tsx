import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarClock, Lock, QrCode, ShieldAlert } from "lucide-react";
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
  const isPaid = booking.paymentStatus === "PAID";
  const isTerminal =
    booking.bookingStatus === "CANCELLED" || booking.bookingStatus === "EXPIRED";
  const isCash =
    booking.paymentMethod === "CASH_ON_DELIVERY" ||
    (typeof booking.paymentId === "object" &&
      booking.paymentId?.paymentMethod === "CASH_ON_DELIVERY");

  if (isTerminal) {
    return (
      <section className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-red-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </span>
            {t("bookingDetails.gate.voidedTitle", { defaultValue: "Gate Pass Voided" })}
          </h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {booking.bookingStatus}
          </span>
        </div>
        <p className="text-center text-[12px] text-red-600 leading-relaxed py-4">
          {t("bookingDetails.gate.voidedDesc", {
            defaultValue:
              "This reservation is no longer active. The vehicle has been released back to the fleet.",
          })}
        </p>
      </section>
    );
  }

  if (!isPaid) {
    return (
      <section className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </span>
            {t("bookingDetails.gate.lockedTitle", {
              defaultValue: "Gate Pass Locked",
            })}
          </h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {isCash
              ? t("bookingDetails.gate.cashPendingBadge", { defaultValue: "Payment Pending" })
              : t("bookingDetails.gate.lockedBadge", { defaultValue: "Payment Required" })}
          </span>
        </div>

        <div className="relative flex items-center justify-center px-3 py-6 bg-[#F8FAFC] rounded-xl overflow-hidden border border-dashed border-amber-300">
          <div className="blur-sm select-none opacity-25">
            <PseudoQr seed={booking._id} className="w-36 h-36 text-slate-400" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/10 backdrop-blur-[2px]">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-amber-950 bg-amber-100/90 px-3 py-1 rounded-full shadow-sm">
              {t("bookingDetails.gate.lockedOverlay", {
                defaultValue: "Locked Until Paid",
              })}
            </span>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#64748B] leading-relaxed">
          {isCash
            ? t("bookingDetails.gate.cashPendingDesc", {
                defaultValue:
                  "Payment pending (Cash on Delivery). Settle payment with the reception agent upon arrival to unlock keys handover.",
              })
            : t("bookingDetails.gate.lockedDesc", {
                defaultValue:
                  "Vehicle handover is locked until payment is completed. You must complete payment via Moamalat to unlock your gate pass and receive the car keys.",
              })}
        </p>

        {!isCash && (
          <Link
            to={`/payment/${booking._id}`}
            className="w-full py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold transition-all text-center shadow-sm"
          >
            {t("bookingDetails.gate.lockedAction", {
              defaultValue: "Complete Payment Now",
            })}
          </Link>
        )}

        <div className="flex items-center justify-center flex-col gap-1.5 pt-1 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
            <CalendarClock className="w-3.5 h-3.5 text-[#142B4A]" />
            {t("bookingDetails.gate.validUntil", {
              date: formatDate(booking.startDate, lang),
            })}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#142B4A] flex items-center justify-center">
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
          <CalendarClock className="w-3.5 h-3.5 text-[#142B4A]" />
          {t("bookingDetails.gate.validUntil", {
            date: formatDate(booking.startDate, lang),
          })}
        </span>
      </div>
    </section>
  );
};

export default GatePassCard;
