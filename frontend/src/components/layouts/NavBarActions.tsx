import React from "react";
import { Heart } from "lucide-react";

interface NavBarActionsProps {
  onDark?: boolean;
}

export const NavBarActions: React.FC<NavBarActionsProps> = ({ onDark = false }) => {
  return (
    <div className="flex items-center gap-4 shrink-0">
      <a
        href="#saved"
        className={`relative p-2 transition-colors flex items-center gap-1.5 text-sm font-semibold ${
          onDark
            ? "text-white hover:text-rose-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
            : "text-slate-600 hover:text-rose-500"
        }`}
        title="Saved Cars"
      >
        <Heart className="w-5 h-5" />
        <span className="hidden md:inline">Saved</span>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
      </a>

      <a
        href="#signin"
        className={`hidden sm:inline-flex items-center text-sm font-semibold transition-colors px-2 py-1 ${
          onDark
            ? "text-white hover:text-blue-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]"
            : "text-slate-700 hover:text-blue-600"
        }`}
      >
        Sign In
      </a>

      <a
        href="#list-fleet"
        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
      >
        List Your Fleet
      </a>
    </div>
  );
};
