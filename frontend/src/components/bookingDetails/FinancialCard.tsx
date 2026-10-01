import React from "react";
import { useTranslation } from "react-i18next";
import { Landmark, TrendingDown, Wallet } from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { formatLYD, rentalDays } from "../../lib/bookingView";

interface FinancialCardProps {
  booking: BookingDto;
}

export const FinancialCard: React.FC<FinancialCardProps> = ({ booking }) => {
  const { t } = useTranslation();
  const isPaid = booking.paymentStatus === "PAID";
  const days = rentalDays(booking.startDate, booking.endDate);
  const rate = booking.dailyRate ?? booking.totalAmount / Math.max(days, 1);
  const hasDiscount = Number(booking.discountAmount) > 0;
  const trx = `#TRX-${booking._id.slice(-5).toUpperCase()}-LY`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center">
            <Landmark className="w-4 h-4" />
          </span>
          {t("bookingDetails.finance.title")}
        </h2>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            isPaid
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isPaid
            ? t("bookingDetails.finance.paid")
            : t("bookingDetails.finance.unpaid")}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 text-[13px]">
        <div className="flex items-center justify-between text-[#475569]">
          <span>
            {t("bookingDetails.finance.rentalLine", {
              days,
              rate: `${rate.toLocaleString("en-US")} LYD`,
            })}
          </span>
          <span className="font-bold text-[#0F172A]" dir="ltr">
            {formatLYD(booking.rentalPrice)} LYD
          </span>
        </div>
        {hasDiscount && (
          <div className="flex items-center justify-between text-emerald-700">
            <span className="inline-flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              {t("bookingDetails.finance.discountLine")}
            </span>
            <span className="font-bold" dir="ltr">
              − {formatLYD(booking.discountAmount)} LYD
            </span>
          </div>
        )}
        <div className="border-t border-dashed border-[#CBD5E1] pt-3 flex items-center justify-between">
          <span className="font-extrabold text-[14px] text-[#0F172A]">
            {t("bookingDetails.finance.totalLine")}
          </span>
          <span
            className="font-extrabold text-[20px] text-[#0F172A] tracking-tight"
            dir="ltr"
          >
            {formatLYD(booking.totalAmount)} <span className="text-[14px]">LYD</span>
          </span>
        </div>
      </div>

      {/* Deposit */}
      <div className="bg-[#FFF7ED] rounded-xl p-4 flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#9A3412]">
          <Wallet className="w-4 h-4 text-[#F97316]" />
          {t("bookingDetails.finance.depositTitle")}
        </span>
        <p className="text-[12px] text-[#7C5A48] leading-relaxed">
          {t("bookingDetails.finance.depositBody")}
        </p>
        <span className="text-[11px] font-bold text-[#F97316]">
          {t("bookingDetails.finance.depositPending")}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 bg-[#F8FAFC] rounded-xl px-4 py-3">
        <span className="text-[12px] text-[#64748B]">
          {t("bookingDetails.finance.trxLabel")}
        </span>
        <span className="font-mono font-bold text-[12px] text-[#0F172A]" dir="ltr">
          {trx}
        </span>
      </div>
    </section>
  );
};

export default FinancialCard;