import React from "react";
import { useTranslation } from "react-i18next";
import { Lock, CreditCard, Banknote, HelpCircle, Wallet } from "lucide-react";
import { CheckoutIcon } from "./CheckoutIcon";
import type { CheckoutMeta } from "../../types/checkout";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] text-[#0F172A] text-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-[#94A3B8]";

interface Props {
  meta: CheckoutMeta;
  tab: "card" | "cash";
  onTab: (tab: "card" | "cash") => void;
  cashDeposit: number;
  cashRemaining: number;
  vehicleTitle: string;
}

const lyd = (n: number) => `${n.toLocaleString("en-US")} LYD`;

export const PaymentSection: React.FC<Props> = ({
  meta,
  tab,
  onTab,
  cashDeposit,
  cashRemaining,
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

          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/50 border border-blue-200/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black">
                  M
                </span>
                <span className="text-[13px] font-bold text-[#0F172A]">
                  Moamalat LightBox Modal (معاملات)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#2563EB]">
                Test Gateway Active
              </span>
            </div>
            <p className="text-[12px] text-[#475569] leading-relaxed">
              Clicking <strong>Pay</strong> launches the official Moamalat LightBox window. You can enter your card details inside the secure popup and confirm your reservation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">Test Card:</span>
              <code className="px-2 py-0.5 rounded bg-white border border-blue-200 font-mono text-[#2563EB] font-bold">
                6393 0000 0000 0000
              </code>
              <span>Exp: 12/28</span>
              <span>CVV: 123</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {payment.cardFields.map((field) => {
              const fullRow = ["cardholder", "cardNumber"].includes(field.id);
              const compact = ["expiry", "cvc", "billingCity"].includes(field.id);
              return (
                <div key={field.id} className={`flex flex-col gap-1.5 ${fullRow ? "sm:col-span-3" : ""}`}>
                  <div className="flex items-center justify-between">
                    <label htmlFor={`pay-${field.id}`} className="text-[12px] font-bold text-[#0F172A]">
                      {t(field.label)}
                    </label>
                    {field.id === "cardNumber" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] font-bold">
                        <Lock className="w-[13px] h-[13px]" />
                        {t(payment.cardValueNote)}
                      </span>
                    ) : field.id === "cvc" ? (
                      <HelpCircle
                        className="w-[15px] h-[15px] text-[#94A3B8]"
                        aria-label={t("checkout.payment.cvcHelp")}
                      />
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      id={`pay-${field.id}`}
                      type={field.type ?? "text"}
                      placeholder={t(field.placeholder)}
                      defaultValue={field.value}
                      className={`${inputCls} ${field.uppercase ? "uppercase" : ""} ${
                        compact ? "text-center" : ""
                      }`}
                    />
                    {field.id === "cardNumber" && (
                      <div className="absolute end-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[11px] font-bold text-[#0F172A]">
                          VISA
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
                {t(payment.cashNote, {
                  title: vehicleTitle,
                  deposit: lyd(cashDeposit),
                  remaining: lyd(cashRemaining),
                })}
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
