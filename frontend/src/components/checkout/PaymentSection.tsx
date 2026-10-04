import React from "react";
import { useTranslation } from "react-i18next";
import { Lock, CreditCard, Banknote, Wallet } from "lucide-react";
import { CheckoutIcon } from "./CheckoutIcon";
import type { CheckoutMeta } from "../../types/checkout";

interface Props {
  meta: CheckoutMeta;
  tab: "card" | "cash";
  onTab: (tab: "card" | "cash") => void;
  vehicleTitle: string;
}

export const PaymentSection: React.FC<Props> = ({
  meta,
  tab,
  onTab,
  vehicleTitle,
}) => {
  const { t } = useTranslation();
  const { payment } = meta;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-[14px]">
            4
          </div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">{t("checkout.payment.title")}</h2>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] text-[11px] font-semibold">
          <Lock className="w-[15px] h-[15px] text-[#2563EB]" />
          {t(payment.lockLabel)}
        </div>
      </div>

      <div className="grid grid-cols-2 p-1 bg-[#F8FAFC] rounded-xl gap-1">
        <button
          type="button"
          onClick={() => onTab("card")}
          className={`py-2.5 px-4 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-2 ${
            tab === "card"
              ? "bg-white text-[#2563EB] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A] font-semibold"
          }`}
        >
          <CreditCard className="w-[18px] h-[18px]" />
          {t(payment.tabCardLabel)}
        </button>
        <button
          type="button"
          onClick={() => onTab("cash")}
          className={`py-2.5 px-4 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-2 ${
            tab === "cash"
              ? "bg-white text-[#2563EB] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A] font-semibold"
          }`}
        >
          <Banknote className="w-[18px] h-[18px]" />
          {t(payment.tabCashLabel)}
        </button>
      </div>

      {tab === "card" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC]">
            <span className="text-[11px] text-[#64748B] uppercase font-bold">
              {t(payment.railLabel)}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {payment.rails.map((rail) => (
                <span
                  key={rail.name}
                  className={`px-2 py-0.5 rounded bg-white text-[11px] font-bold ${
                    rail.highlight ? "text-[#2563EB]" : "text-[#0F172A]"
                  }`}
                >
                  {t(rail.name)}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/50 border border-blue-200/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black">
                  M
                </span>
                <span className="text-[13px] font-bold text-[#0F172A]">
                  Moamalat LightBox (معاملات)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#2563EB]">
                Secure Gateway
              </span>
            </div>
            <p className="text-[12px] text-[#475569] leading-relaxed">
              After clicking <strong>Pay</strong>, a secure Moamalat popup will open where you can safely enter your card details. No card information is collected or stored on this page.
            </p>
            <div className="flex items-center gap-2">
              <Lock className="w-[13px] h-[13px] text-[#2563EB] shrink-0" />
              <span className="text-[11px] text-[#64748B] font-semibold">
                Your card details are entered directly in the Moamalat secure popup — encrypted end-to-end.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#F8FAFC]">
          <div className="flex items-start gap-3">
            <Wallet className="w-[24px] h-[24px] text-[#2563EB] mt-0.5" />
            <div className="flex flex-col gap-1">
              <h4 className="text-[15px] font-bold text-[#0F172A]">
                {t("checkout.payment.cashDepositHeading", { percent: payment.cashDepositPercent })}
              </h4>
              <p className="text-[14px] text-[#64748B] leading-relaxed">
                {t(payment.cashNote, { title: vehicleTitle })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-center sm:text-start">
        {payment.trustBadges.map((badge) => (
          <div key={badge.text} className="flex items-center gap-2 text-[#64748B] text-[11px]">
            <CheckoutIcon name={badge.icon} className="w-[16px] h-[16px] text-[#2563EB] shrink-0" />
            {t(badge.text)}
          </div>
        ))}
      </div>
    </section>
  );
};
