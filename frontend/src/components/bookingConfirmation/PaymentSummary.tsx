import React from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CreditCard } from "lucide-react";
import type { ConfirmationData } from "../../types/bookingConfirmation";
import type { BookingDto } from "../../types/booking";

interface Props {
  data: ConfirmationData;
  paymentStatus?: BookingDto["paymentStatus"];
  paymentMethod?: string;
}

export const PaymentSummary: React.FC<Props> = ({
  data,
  paymentStatus,
  paymentMethod,
}) => {
  const { t } = useTranslation();
  const { meta, fareLines, total, cardEnding, authRef } = data;
  const { payment } = meta;
  const isPaid = paymentStatus === undefined || paymentStatus === "PAID";
  const isUnpaidCash =
    paymentStatus === "UNPAID" && paymentMethod === "CASH_ON_DELIVERY";

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-[18px] text-[#0F172A] font-bold">{t(payment.title)}</h3>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${isPaid ? "bg-[#F8FAFC] text-[#2563EB]" : "bg-amber-50 text-amber-800"}`}>
          {t(isPaid ? payment.paidBadge : "booking.payment.pendingBadge")}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 text-[14px]">
        {fareLines.map((line) => (
          <div key={line.label} className="flex items-center justify-between text-[#64748B]">
            <span>
              {t(line.label, line.nameKey ? { ...line.values, name: t(line.nameKey) } : line.values)}
            </span>
            <span className="font-mono text-[#0F172A] font-semibold">{line.amount}</span>
          </div>
        ))}
        {paymentStatus !== "UNPAID" && payment.depositAmount && <div className="pt-2">
          <div className="p-3 rounded-xl bg-[#F8FAFC] flex items-center justify-between">
            <span className="text-[12px] text-[#0F172A] font-medium">{t(payment.depositLabel)}</span>
            <span className="font-mono font-bold text-[#0F172A]">{payment.depositAmount}</span>
          </div>
        </div>}
      </div>

      <div className="mt-2 pt-4 bg-[#E5EEFF]/60 p-4 rounded-xl flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-[#64748B] font-bold">
            {t(isPaid ? payment.totalLabel : "booking.payment.totalDue")}
          </span>
          <span className="text-[11px] text-[#94A3B8]">
            {t(isPaid ? payment.totalNote : "booking.payment.pendingNote")}
          </span>
        </div>
        <div className="text-end">
          <span className="text-[32px] font-bold text-[#2563EB] font-mono leading-none">
            {total}
          </span>
        </div>
      </div>

      {isPaid && authRef ? (
        <div className="flex items-center gap-3 pt-2 text-[#64748B] text-[11px]">
          <CreditCard className="w-[18px] h-[18px] text-[#2563EB]" />
          <span>
            {t(payment.viaNote)} <strong className="text-[#0F172A">{cardEnding}</strong> (
            {t("booking.payment.authLabel")} <strong className="text-[#0F172A">{authRef}</strong>)
          </span>
        </div>
      ) : !isPaid ? (
        <div className="flex items-center gap-3 pt-2 text-[#64748B] text-[11px]">
          <Banknote className="w-[18px] h-[18px] text-amber-700" />
          <span>
            {t(
              isUnpaidCash
                ? "booking.payment.cashPendingNote"
                : "booking.payment.pendingNote",
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
};