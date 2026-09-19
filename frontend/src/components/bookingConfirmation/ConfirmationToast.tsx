import React from "react";
import { CheckCircle2 } from "lucide-react";

export const ConfirmationToast: React.FC<{ text: string | null }> = ({ text }) => (
  <div
    className={`fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-xl transition-all duration-300 ${
      text ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
    }`}
  >
    <CheckCircle2 className="w-[20px] h-[20px] text-[#B4C5FF]" />
    <span className="text-[12px]">{text}</span>
  </div>
);