import React from "react";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { Link } from "react-router";

interface NavBarLogoProps {
  onDark?: boolean;
}

export const NavBarLogo: React.FC<NavBarLogoProps> = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <Link to="/" className="flex items-center gap-2.5 group shrink-0">
      {/* Brand Icon Circle */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
        <Zap className="w-5 h-5 fill-white text-white" />
      </div>

      {/* Brand Text & Tagline */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            NexRide
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 tracking-wide">
            {t("nav.libya")}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5 leading-none">
          {isAr ? "نَبْضٌ للتنقل الفاخر" : "Pulse of Luxury Mobility"}
        </span>
      </div>
    </Link>
  );
};

export default NavBarLogo;
