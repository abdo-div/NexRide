import React from "react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";
import { motion } from "framer-motion";

export const Hero: React.FC = () => {
  return (
    <section className="relative z-40 flex min-h-[760px] w-full flex-col justify-end overflow-visible border-b border-slate-800 bg-[#071426] pb-14 pt-36 sm:pt-40">
      <motion.div
        initial={{ scale: 1.025, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <img
          src="/screen.png"
          alt="Premium vehicles available through NexRide"
          fetchPriority="high"
          className="pointer-events-none h-full w-full object-cover object-[62%_center]"
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,15,29,.97)_0%,rgba(7,20,38,.91)_38%,rgba(7,20,38,.52)_64%,rgba(7,20,38,.16)_100%)] rtl:bg-[linear-gradient(270deg,rgba(5,15,29,.97)_0%,rgba(7,20,38,.91)_38%,rgba(7,20,38,.52)_64%,rgba(7,20,38,.16)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(59,130,246,.14),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#071426] via-[#071426]/65 to-transparent" />
      </motion.div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <HeroHeader />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <SearchConsole />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
