import React from "react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

export const ExecutionTimeline: React.FC<{ meta: ConfirmationMeta }> = ({ meta }) => {
  const { milestones } = meta;

  const stateCls = (state: string) => {
    if (state === "done") return "bg-[#DBE1FF] text-[#2563EB]";
    if (state === "next") return "bg-[#2563EB] text-white animate-pulse";
    return "bg-[#F1F5F9] text-[#64748B]";
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
      <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#64748B] mb-6">
        Reservation Execution Schedule
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {milestones.map((m) => (
          <div
            key={m.step}
            className={`flex items-start gap-4 ${m.state === "pending" ? "opacity-70" : ""}`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${stateCls(m.state)}`}
            >
              <ConfirmationIcon name={m.icon} className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-[11px] uppercase tracking-wide font-bold ${
                  m.state === "pending" ? "text-[#64748B]" : "text-[#2563EB]"
                }`}
              >
                {m.step} • {m.status}
              </span>
              <span className="text-[16px] text-[#0F172A] font-bold">{m.title}</span>
              <span className="text-[14px] text-[#64748B] mt-0.5">{m.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};