import React from "react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";

export const Hero: React.FC = () => {
  return (
    <section className="relative z-40 w-full bg-slate-900 pt-28 pb-12 border-b border-slate-200 min-h-[680px] flex flex-col justify-between">
      {/* Background Image Layer (Spans 100% Width & Height) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/public/screen.png"
          alt="Fleet Background"
          className="w-full h-full object-cover object-center"
        />

        {/* Soft White Gradient Layer to keep left-side text fully readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 via-45% to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="w-full px-6 lg:px-12 relative z-10">
        <HeroHeader />
        <SearchConsole />
      </div>
    </section>
  );
};
