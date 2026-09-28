import React from "react";
import { useTranslation } from "react-i18next";
import {
  Star,
  Landmark,
  Plane,
  Verified,
  Headset,
  MapPin,
} from "lucide-react";

export const AuthBrandShowcase: React.FC = () => {
  const { t } = useTranslation();

  const PERKS = [
    {
      icon: Landmark,
      title: t("auth.showcase.perks.escrow.title"),
      description: t("auth.showcase.perks.escrow.desc"),
    },
    {
      icon: Plane,
      title: t("auth.showcase.perks.tarmac.title"),
      description: t("auth.showcase.perks.tarmac.desc"),
    },
    {
      icon: Verified,
      title: t("auth.showcase.perks.vin.title"),
      description: t("auth.showcase.perks.vin.desc"),
    },
  ];

  return (
    <div className="flex flex-col justify-between rounded-xl p-6 lg:p-10 bg-gradient-to-br from-[#0b1c30] via-[#132842] to-[#004ac6] text-white shadow-[0_12px_32px_-4px_rgba(15,23,42,0.18)] relative overflow-hidden">
      {/* Inset Ambient Design Elements */}
      <div className="absolute -top-24 -end-24 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -start-24 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none"></div>

      {/* Top Content Block */}
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white font-bold">
            {t("auth.showcase.badge")}
          </span>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px]">
            <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
            <span className="font-bold">4.98</span>
            <span className="text-white/70">{t("auth.showcase.reviews")}</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl lg:text-[40px] font-bold tracking-tight leading-tight">
            {t("auth.showcase.heading")}
          </h2>
          <p className="text-sm lg:text-base text-white/80 mt-3">
            {t("auth.showcase.subtitle")}
          </p>
        </div>

        {/* Feature Stack / Perks */}
        <div className="flex flex-col gap-4 mt-3">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/40 flex items-center justify-center flex-shrink-0 text-white">
                <perk.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">{perk.title}</span>
                <span className="text-sm text-white/75 mt-0.5">
                  {perk.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Image Showcase Container */}
      <div className="relative z-10 mt-6 rounded-xl overflow-hidden shadow-2xl bg-white/10">
        <div className="relative h-48 w-full">
          <img
            src="/3carsUpdated.png"
            alt="Luxury Mercedes-Benz fleet on the Tripoli Corniche"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-3 start-4 end-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-bold">
                {t("auth.showcase.terminal")}
              </p>
              <p className="text-white/80 text-[11px]">
                {t("auth.showcase.terminalSub")}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/90 text-white text-[11px] font-bold uppercase tracking-wider">
              {t("auth.showcase.liveEscort")}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Concierge & Enterprise Trust Strip */}
      <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Headset className="w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-[10px] text-white/60 uppercase">
              {t("auth.showcase.concierge")}
            </p>
            <p className="text-xs font-bold">+218 (21) 444-6397</p>
          </div>
        </div>
        <div className="text-[11px] text-white/70 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>
            {t("auth.showcase.trustedBy")}{" "}
            <span className="font-bold text-white">140+</span>{" "}
            {t("auth.showcase.enterprises")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandShowcase;