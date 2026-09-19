import React from "react";
import { CreditCard } from "lucide-react";
import type { ConfirmationData } from "../../types/bookingConfirmation";

export const PaymentSummary: React.FC<{ data: ConfirmationData }> = ({ data }) => {
  const { meta, fareLines, total, cardEnding, authRef } = data;
  const { payment } = meta;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-[18px] text-[#0F172A] font-bold">{payment.title}</h3>
        <span className="px-2.5 py-1 rounded-full bg-[#F8FAFC] text-[11px] text-[#2563EB] font-bold">
          {payment.paidBadge}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 text-[14px]">
        {fareLines.map((line) => (
          <div key={line.label} className="flex items-center justify-between text-[#64748B]">
            <span>{line.label}</span>
            <span className="font-mono text-[#0F172A] font-semibold">{line.amount}</span>
          </div>
        ))}
        <div className="pt-2">
          <div className="p-3 rounded-xl bg-[#F8FAFC] flex items-center justify-between">
            <span className="text-[12px] text-[#0F172A] font-medium">{payment.depositLabel}</span>
            <span className="font-mono font-bold text-[#0F172A]">{payment.depositAmount}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-4 bg-[#E5EEFF]/60 p-4 rounded-xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-[#64748B] font-bold">
            {payment.totalLabel}
          </span>
          <span className="text-[11px] text-[#94A3B8]">{payment.totalNote}</span>
        </div>
        <div className="text-right">
          <span className="text-[32px] font-bold text-[#2563EB] font-mono leading-none">
            {total}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 text-[#64748B] text-[11px]">
        <CreditCard className="w-[18px] h-[18px] text-[#2563EB]" />
        <span>
          {payment.viaNote} <strong className="text-[#0F172A]">{cardEnding}</strong> (Auth: #
          <strong className="text-[#0F172A]">{authRef}</strong>)
        </span>
      </div>
    </div>
  );
};