import React, { useEffect, useRef } from "react";
import { HeroHeader } from "./HeroHeader";
import { SearchConsole } from "./SearchConsole";
import { motion } from "framer-motion";
import { animate, stagger } from "animejs";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const Hero: React.FC = () => {
  const heroRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const scene = sceneRef.current;
    if (!hero || !scene) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cars = hero.querySelectorAll<HTMLElement>("[data-hero-car]");
    const words = hero.querySelectorAll<HTMLElement>("[data-hero-word]");
    const search = hero.querySelector<HTMLElement>("[data-hero-search]");
    if (reduce) {
      [...cars, ...words, ...(search ? [search] : [])].forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      return;
    }

    const carAnimation = animate(cars, { opacity: [0, 1], translateZ: [-400, 0], rotateX: [-15, 0], delay: stagger(115), duration: 1450, ease: "outExpo" });
    const wordAnimation = animate(words, { opacity: [0, 1], translateY: [30, 0], rotateX: [16, 0], delay: stagger(58, { start: 180 }), duration: 900, ease: "outExpo" });
    const searchAnimation = search ? animate(search, { opacity: [0, 1], rotateX: [45, 0], translateZ: [-100, 0], delay: 520, duration: 1400, ease: "outElastic(1, .6)" }) : null;

    const context = gsap.context(() => {
      gsap.to(scene, { scale: 0.95, opacity: 0.5, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 } });
      cars.forEach((car, index) => gsap.to(car, { xPercent: index === 0 ? -10 : index === 2 ? 12 : 0, z: index === 1 ? -150 : -80 - index * 35, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 + index * 0.2 } }));
    }, hero);

    return () => { carAnimation.cancel(); wordAnimation.cancel(); searchAnimation?.cancel(); context.revert(); };
  }, []);

  return (
    <section ref={heroRef} className="hero-perspective relative z-40 flex min-h-[700px] w-full flex-col justify-between overflow-visible border-b border-slate-200 bg-slate-900 pb-14 pt-32">
      <div ref={sceneRef} className="hero-3d-scene absolute inset-0 z-0 will-change-[transform,opacity]">
      {/* Background Image Layer (Spans 100% Width & Height) */}
      <motion.div
        initial={{ scale: 1.05, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <img
          src="/screen.png"
          alt="Fleet Background"
          className="pointer-events-none h-full w-full object-cover object-center"
        />

        <div className="hero-car-layers pointer-events-none absolute inset-0" aria-hidden="true">
          {(["left", "center", "right"] as const).map((car) => (
            <div key={car} data-hero-car={car} className={`hero-car-layer hero-car-${car}`}>
              <img src="/screen.png" alt="" className="h-full w-full object-cover object-center" />
            </div>
          ))}
        </div>

        {/* Soft White Gradient Layer to keep left-side text fully readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-white via-white/85 via-45% to-transparent" />
      </motion.div>
      </div>

      {/* Content Container */}
      <div className="w-full px-6 lg:px-12 relative z-10">
        <HeroHeader />
        <motion.div data-hero-search style={{ opacity: 0, transformOrigin: "center bottom" }} className="will-change-[transform,opacity] [backface-visibility:hidden]">
          <SearchConsole />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
