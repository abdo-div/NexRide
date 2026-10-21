import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";

const HERO_SLIDES = [
  "/nexride-hero-sunset-v2.png",
  "/nexride-hero-coast-v3.png",
  "/nexride-hero-marina-v4.png",
  "/nexride-hero-mountain-v5.png",
];

export const Hero: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % HERO_SLIDES.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const changeSlide = (direction: number) => {
    setActiveSlide(
      (current) => (current + direction + HERO_SLIDES.length) % HERO_SLIDES.length,
    );
  };

  return (
    <section className="relative z-40 flex min-h-[680px] w-full flex-col justify-end overflow-hidden border-b border-slate-800 bg-[#071426] pb-8 pt-28 sm:min-h-[700px] lg:min-h-[650px] lg:pt-24">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={HERO_SLIDES[activeSlide]}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0"
          >
            <img src={HERO_SLIDES[activeSlide]} alt="" fetchPriority={activeSlide === 0 ? "high" : "auto"} className="h-full w-full object-cover object-center rtl:-scale-x-100" />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,12,25,.94)_0%,rgba(5,18,35,.76)_37%,rgba(5,18,35,.18)_72%,rgba(5,18,35,.04)_100%)] rtl:bg-[linear-gradient(270deg,rgba(3,12,25,.94)_0%,rgba(5,18,35,.76)_37%,rgba(5,18,35,.18)_72%,rgba(5,18,35,.04)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,20,.38)_0%,transparent_42%,rgba(2,8,20,.72)_100%)]" />
      </div>

      <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous hero image" className="absolute start-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-950/35 text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white hover:text-slate-950 lg:grid">
        <ChevronLeft className="size-5 rtl:rotate-180" />
      </button>
      <button type="button" onClick={() => changeSlide(1)} aria-label="Next hero image" className="absolute end-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-950/35 text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white hover:text-slate-950 lg:grid">
        <ChevronRight className="size-5 rtl:rotate-180" />
      </button>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <HeroHeader />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <SearchConsole />
        </motion.div>
        <div className="mt-3 flex justify-center gap-2" aria-label="Hero image slides">
          {HERO_SLIDES.map((slide, index) => (
            <button key={slide} type="button" onClick={() => setActiveSlide(index)} aria-label={`Show hero image ${index + 1}`} aria-current={index === activeSlide ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${index === activeSlide ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
