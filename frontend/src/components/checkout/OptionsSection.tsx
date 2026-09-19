import React from "react";
import type { CheckoutMeta } from "../../types/checkout";

export const OptionsSection: React.FC<{
  meta: CheckoutMeta;
  selected: Set<string>;
  onToggle: (id: string) => void;
}> = ({ meta, selected, onToggle }) => {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-[14px]">
            3
          </div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">{meta.optionsTitle}</h2>
        </div>
        <p className="text-[14px] text-[#64748B] ml-10">{meta.optionsIntro}</p>
      </div>

      <div className="flex flex-col gap-3">
        {meta.addons.map((addon) => {
          const checked = selected.has(addon.id);
          const isDay = addon.unit === "day";
          return (
            <label
              key={addon.id}
              className="group relative flex items-start gap-4 p-4 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-all cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(addon.id)}
                className="mt-1 w-5 h-5 rounded accent-[#2563EB]"
              />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-[#0F172A]">{addon.name}</span>
                    {addon.recommended && (
                      <span className="px-2 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-bold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-[#64748B]">{addon.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[15px] font-bold text-[#0F172A]">
                    +{addon.price.toLocaleString("en-US")} LYD
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    {isDay ? "/ day" : "flat fee"}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
};