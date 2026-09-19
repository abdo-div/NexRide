import React from "react";
import { Link } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { CheckoutMeta } from "../../types/checkout";

export const CheckoutHeader: React.FC<{
  vehicleId: string;
  meta: CheckoutMeta;
}> = ({ vehicleId, meta }) => {
  return (
    <div className="bg-white shadow-sm border-b border-[#E2E8F0]">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/cars/${vehicleId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] transition-colors text-[13px] font-semibold"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
            {meta.backLabel}
          </Link>
          <nav className="hidden sm:flex items-center gap-2 text-[13px] text-[#64748B] overflow-x-auto">
            {meta.crumbs.map((crumb, i) => {
              const last = i === meta.crumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-[#2563EB] transition-colors shrink-0 font-medium">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={last ? "text-[#2563EB] font-bold shrink-0" : "truncate max-w-[200px] font-medium"}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-[12px] font-bold self-start lg:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
          {meta.stepLabel}
        </div>
      </div>
    </div>
  );
};