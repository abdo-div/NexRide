import React from "react";
import { StepCard } from "./StepCard";
import { HOW_IT_WORKS_STEPS } from "../../data/stepsData";

export const HowItWorks: React.FC = () => {
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-white border-b border-slate-100">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
          FRICTIONLESS AUTOMOTIVE MOBILITY
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase mb-4">
          RENT IN 4 SIMPLE STEPS
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          Say goodbye to informal phone reservations, untracked cash deposits,
          and unpredictable vehicle condition.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <StepCard key={step.stepNumber} step={step} />
        ))}
      </div>
    </section>
  );
};
