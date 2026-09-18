import React from "react";
import { LIVE_BOOKING_FEED } from "../../data/partnerData";

export const PartnerDashboardMock: React.FC = () => {
  return (
    <div className="bg-[#0b1220] border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden group">
      {/* OS Header Bar */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 font-mono ml-2">
            NexRide Partner OS v3.2
          </span>
        </div>

        <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/50 text-[10px] font-extrabold text-emerald-400 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE TELEMETRY
        </span>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Monthly Payouts Box */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Monthly Payouts
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tracking-tight">
              184,500
            </span>
            <span className="text-xs font-bold text-cyan-400">LYD</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-1 block">
            ↑ +28% vs last month
          </span>
        </div>

        {/* Active Fleet Utilization Box */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            Active Fleet Utilization
          </span>
          <span className="text-2xl font-black text-white tracking-tight">
            94.2%
          </span>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
            48 of 51 Vehicles on Road
          </span>
        </div>
      </div>

      {/* Bottom Live Feed Box */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-300">
            Real-time Bookings Feed
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800/50 text-[10px] font-bold text-blue-400">
            +24 New Today
          </span>
        </div>

        <div className="space-y-2">
          {LIVE_BOOKING_FEED.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-[#0b1220] border border-slate-800/60 px-3.5 py-2.5 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-slate-300">
                  {item.location} • {item.vehicleName}
                </span>
              </div>
              <span className="font-extrabold text-white">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
