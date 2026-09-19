import React from "react";
import { Info } from "lucide-react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

export const HandoverProtocol: React.FC<{ meta: ConfirmationMeta }> = ({ meta }) => {
  const { protocol } = meta;
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[20px] text-[#0F172A] font-bold">{protocol.title}</h3>
          <p className="text-[14px] text-[#64748B]">{protocol.subtitle}</p>
        </div>
        <Info className="text-[#94A3B8] w-[24px] h-[24px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {protocol.cards.map((card) => (
          <div key={card.title} className="p-4 rounded-xl bg-[#F8FAFC] flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#2563EB] shadow-sm">
              <ConfirmationIcon name={card.icon} className="w-[20px] h-[20px]" />
            </div>
            <span className="text-[16px] text-[#0F172A] font-bold">{card.title}</span>
            <p className="text-[14px] text-[#64748B]">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};