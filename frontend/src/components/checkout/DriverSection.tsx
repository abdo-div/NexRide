import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { CheckoutMeta } from "../../types/checkout";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] text-[#0F172A] text-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all placeholder:text-[#94A3B8]";

export const DriverSection: React.FC<{ meta: CheckoutMeta }> = ({ meta }) => {
  const [confirmed, setConfirmed] = useState(true);

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-[14px]">
            2
          </div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">{meta.driverTitle}</h2>
        </div>
        <p className="text-[14px] text-[#64748B] ml-10">{meta.driverIntro}</p>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meta.driverFields.map((field) => (
          <div key={field.id} className={`flex flex-col gap-1.5 ${field.span2 ? "md:col-span-2" : ""}`}>
            <div className="flex items-center justify-between">
              <label htmlFor={`driver-${field.id}`} className="text-[12px] font-bold text-[#0F172A]">
                {field.label}
              </label>
              {field.badge && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    field.badgeKind === "verified" ? "text-[#2563EB]" : "text-[#64748B]"
                  }`}
                >
                  {field.badgeKind === "verified" && <CheckCircle2 className="w-[14px] h-[14px]" />}
                  {field.badge}
                </span>
              )}
            </div>
            <div
              className={`flex items-center bg-[#F8FAFC] rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/30 transition-all overflow-hidden ${
                field.prefix ? "px-3" : ""
              }`}
            >
              {field.prefix && (
                <span className="flex items-center gap-1.5 pr-2 mr-2 text-[#0F172A] text-[15px] font-semibold select-none border-r border-[#E2E8F0] py-2.5">
                  <span className="text-base">🇱🇾</span>
                  <span>{field.prefix}</span>
                </span>
              )}
              <input
                id={`driver-${field.id}`}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                defaultValue={field.value}
                className={`${inputCls} ${field.prefix ? "bg-transparent focus:bg-transparent focus:ring-0" : ""} ${
                  field.uppercase ? "uppercase" : ""
                }`}
              />
            </div>
            {field.hint && <p className="text-[11px] text-[#64748B]">{field.hint}</p>}
          </div>
        ))}

        <div className="md:col-span-2 pt-1">
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F8FAFC] cursor-pointer hover:bg-[#F1F5F9] transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded accent-[#2563EB]"
            />
            <span className="text-[14px] text-[#0F172A]">
              {meta.driverConfirm.prefix} <strong>{meta.driverConfirm.strong}</strong> and has held a
              valid physical driver&apos;s license for a minimum of 2 consecutive years.
            </span>
          </label>
        </div>
      </form>
    </section>
  );
};