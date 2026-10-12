import React from "react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";
import { motion } from "framer-motion";

export const Hero: React.FC = () => {
  return (
    <section className="relative z-40 flex min-h-[700px] w-full flex-col justify-between overflow-visible border-b border-slate-200 bg-slate-950 pb-14 pt-32">
      <motion.div
        initial={{ scale: 1.025, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <img
          src="/screen.png"
          alt="Fleet Background"
          className="pointer-events-none h-full w-full object-cover object-center"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/90 via-45% to-white/5 rtl:bg-gradient-to-l" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/30 to-transparent" />
      </motion.div>

      {/* Content Container */}
      <div className="w-full px-6 lg:px-12 relative z-10">
        <HeroHeader />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <SearchConsole />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
