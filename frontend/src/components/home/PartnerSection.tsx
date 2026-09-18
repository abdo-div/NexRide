import React from "react";
import { Rocket, ArrowRight, BookOpen } from "lucide-react";
import { PartnerDashboardMock } from "./PartnerDashboardMock";
import { PartnerMetrics } from "./PartnerMetrics";

export const PartnerSection: React.FC = () => {
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-[#020617] border-b border-slate-900 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Interactive UI Dashboard Mock */}
        <div className="lg:col-span-6">
          <PartnerDashboardMock />
        </div>

        {/* Right Column: CTA Content */}
        <div className="lg:col-span-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-[11px] font-bold text-blue-400 mb-6">
            <Rocket className="w-3.5 h-3.5 text-rose-500" />
            <span>FOR CAR RENTAL AGENCIES & FLEET OWNERS</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-[1.1] mb-6">
            GROW YOUR RENTAL BUSINESS WITH NEXRIDE
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            Manage your vehicles, receive verified bookings, and eliminate
            non-paying clients with digital escrow protection. Connect directly
            to domestic executives, international travelers, and diplomatic
            missions.
          </p>

          {/* Feature Cards Grid */}
          <PartnerMetrics />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#list-fleet"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>List Your Fleet Today</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#partner-guidelines"
              className="px-6 py-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-extrabold text-xs flex items-center gap-2 transition-all"
            >
              <span>Partner Guidelines</span>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
