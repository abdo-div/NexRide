import React from "react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationData } from "../../types/bookingConfirmation";

export const RouteSchedule: React.FC<{ data: ConfirmationData }> = ({ data }) => {
  const { route } = data.meta;
  const stops = [route.pickup, route.dropoff];

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] text-[#0F172A] font-bold">{route.title}</h3>
        <span className="text-[11px] bg-[#F8FAFC] px-2.5 py-1 rounded-md text-[#64748B] font-bold">
          {route.daysBadge}
        </span>
      </div>
      <div className="space-y-4">
        {stops.map((stop) => (
          <div key={stop.label} className="flex items-start gap-3 relative">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                stop.primary ? "bg-[#DBE1FF] text-[#2563EB]" : "bg-[#F8FAFC] text-[#64748B]"
              }`}
            >
              <ConfirmationIcon name={stop.icon} className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-[11px] font-bold uppercase ${
                  stop.primary ? "text-[#2563EB]" : "text-[#64748B]"
                }`}
              >
                {stop.label}
              </span>
              <span className="text-[16px] font-bold text-[#0F172A]">{stop.location}</span>
              <span className="text-[14px] text-[#64748B]">{stop.datetime}</span>
              {stop.note && (
                <p className="text-[11px] text-[#64748B] mt-1.5 p-2 rounded bg-[#F8FAFC]">
                  {stop.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteSchedule;