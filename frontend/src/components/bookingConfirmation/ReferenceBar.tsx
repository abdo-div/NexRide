import React from "react";
import { Copy } from "lucide-react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

export const ReferenceBar: React.FC<{ meta: ConfirmationMeta; onCopy: () => void }> = ({
  meta,
  onCopy,
}) => {
  const { reference } = meta;
  return (
    <div className="bg-[#F8FAFC] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-[#0F172A] font-semibold">
          {reference.label}
        </span>
        <span className="text-[16px] text-[#2563EB] font-bold tracking-tight bg-white px-3 py-1 rounded-lg shadow-sm font-mono">
          {reference.code}
        </span>
        <button
          type="button"
          onClick={onCopy}
          title="Copy code"
          className="p-1.5 rounded-lg text-[#0F172A] hover:text-[#2563EB] hover:bg-white transition-all"
        >
          <Copy className="w-[18px] h-[18px]" />
        </button>
      </div>
      <div className="flex items-center gap-6 text-[11px] text-[#0F172A]">
        {reference.chips.map((chip) => (
          <div key={chip.text} className="flex items-center gap-2">
            <ConfirmationIcon name={chip.icon} className="w-[16px] h-[16px] text-[#2563EB]" />
            <span>{chip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};