import React from "react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";
import { motion } from "framer-motion";

export const Hero: React.FC = () => {
  return (
    <section className="relative z-40 w-full bg-slate-900 pt-32 pb-14 border-b border-slate-200 min-h-[700px] flex flex-col justify-between overflow-hidden">
      {/* Background Image Layer (Spans 100% Width & Height) */}
      <motion.div
        initial={{ scale: 1.05, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <img
          src="/public/screen.png"
          alt="Fleet Background"
          className="w-full h-full object-cover object-center"
        />

        {/* Soft White Gradient Layer to keep left-side text fully readable */}
        <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-white via-white/85 via-45% to-transparent" />
      </motion.div>

      {/* Content Container */}
      <div className="w-full px-6 lg:px-12 relative z-10">
        <HeroHeader />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <SearchConsole />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
