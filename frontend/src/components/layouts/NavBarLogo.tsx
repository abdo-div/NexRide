import React from "react";
import { Car } from "lucide-react";
import { Link } from "react-router";

interface NavBarLogoProps {
  onDark?: boolean;
}

export const NavBarLogo: React.FC<NavBarLogoProps> = ({ onDark = false }) => {
  return (
    <div className="flex items-center gap-8 shrink-0">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Car className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold text-2xl tracking-tight transition-colors ${
              onDark
                ? "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
                : "text-slate-900"
            }`}
          >
            Nex<span className="text-blue-600">Ride</span>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wider transition-colors ${
              onDark
                ? "bg-white/15 border-white/25 text-white"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >
            LIBYA
          </span>
        </div>
      </Link>
    </div>
  );
};
