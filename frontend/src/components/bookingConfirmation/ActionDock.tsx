import React from "react";
import { Link } from "react-router";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

export const ActionDock: React.FC<{ meta: ConfirmationMeta }> = ({ meta }) => {
  const { dock } = meta;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 mb-4">
      <Link
        to={dock.back.to}
        className="text-[14px] text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1.5"
      >
        {dock.back.icon && <ConfirmationIcon name={dock.back.icon} className="w-[18px] h-[18px]" />}
        <span>{dock.back.label}</span>
      </Link>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {dock.actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl text-[12px] font-bold transition-all shadow-sm ${
              action.primary
                ? "bg-[#2563EB] hover:bg-blue-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
                : "bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A]"
            }`}
          >
            <span>{action.label}</span>
            {action.icon && <ConfirmationIcon name={action.icon} className="w-[18px] h-[18px]" />}
          </Link>
        ))}
      </div>
    </div>
  );
};