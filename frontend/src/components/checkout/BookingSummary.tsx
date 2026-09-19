import React from "react";
import { Link } from "react-router";
import { BadgeCheck, Star, Shield, ArrowRight } from "lucide-react";
import { CheckoutIcon } from "./CheckoutIcon";
import type { CheckoutMeta, CheckoutTotals } from "../../types/checkout";
import type { Vehicle } from "../../types/vehicle";

interface Props {
  vehicle: Vehicle;
  meta: CheckoutMeta;
  totals: CheckoutTotals;
  phase: "idle" | "processing" | "done";
  onConfirm: () => void;
}

const totalLyd = (n: number) => `${n.toLocaleString("en-US")} LYD`;

export const BookingSummary: React.FC<Props> = ({ vehicle, meta, totals, phase, onConfirm }) => {
  const { itinerary, municipalLabel, securityDeposit, totalLabel, totalNote } = meta;
  const chips = [vehicle.specs.engine, vehicle.specs.gearbox, vehicle.specs.seats, vehicle.specs.fuel];

  return (
    <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24 self-start w-full">
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#E2E8F0] flex flex-col gap-6">
        {/* Vehicle visual & heading */}
        <div className="flex flex-col gap-3.5">
          <div className="relative w-full h-52 rounded-xl overflow-hidden bg-slate-100">
            <img
              src={vehicle.image}
              alt={vehicle.title}
              className="w-full h-full object-cover"
            />
            {vehicle.badgeTag && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-md text-[11px] font-bold text-[#0F172A]">
                {vehicle.badgeTag}
              </div>
            )}
            {vehicle.badgeTagSecondary && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#2563EB] text-white text-[11px] font-bold">
                {vehicle.badgeTagSecondary}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-bold text-[#0F172A] leading-tight">{vehicle.title}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B] text-[11px]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-[12px]">
                {vehicle.operator.initials}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-bold text-[#0F172A]">
                    {vehicle.operator.name}
                  </span>
                  {vehicle.operator.isVerified && <BadgeCheck className="w-[14px] h-[14px] text-[#2563EB]" />}
                </div>
                <span className="text-[11px] text-[#64748B]">
                  {vehicle.operator.rating.toFixed(2)} · {vehicle.operator.reviewsCount} reviews
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white text-[11px] font-bold text-[#0F172A]">
              <Star className="w-[14px] h-[14px] fill-[#F97316] text-[#F97316]" />
              {vehicle.operator.rating.toFixed(2)}
              <span className="text-[#94A3B8] font-normal">({vehicle.operator.reviewsCount})</span>
            </div>
          </div>
        </div>

        {/* Timeline recap */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] flex flex-col gap-2 text-[11px]">
          {[
            { label: `Pick-up: ${itinerary.pickup.date}, ${itinerary.pickup.time}`, value: itinerary.pickup.location },
            { label: `Return: ${itinerary.dropoff.date}, ${itinerary.dropoff.time}`, value: itinerary.dropoff.location },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-[#64748B] flex items-center gap-1.5">{row.label}</span>
              <span className="font-semibold text-[#0F172A] truncate max-w-[50%]">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Fare breakdown */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[15px] font-bold text-[#0F172A]">Fare &amp; Fee Details</h3>
          <div className="flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between items-center text-[#0F172A]">
              <span>Vehicle Base Rental ({totals.baseNote})</span>
              <span className="font-semibold">{totalLyd(totals.base)}</span>
            </div>
            {totals.addonLines.map((line) => (
              <div key={line.id} className="flex justify-between items-center text-[#0F172A]">
                <span className="text-[#64748B]">{line.label}</span>
                <span className="font-semibold">{totalLyd(line.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-[#0F172A]">
              <span className="text-[#64748B]">{municipalLabel}</span>
              <span className="font-semibold">{totalLyd(totals.municipalFee)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-[18px] h-[18px] text-[#2563EB]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#0F172A]">{securityDeposit.label}</span>
                <span className="text-[10px] text-[#64748B]">{securityDeposit.note}</span>
              </div>
            </div>
            <span className="text-[12px] font-bold text-[#0F172A]">
              {totalLyd(securityDeposit.amount)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
                {totalLabel}
              </span>
              <span className="text-[10px] text-[#94A3B8]">{totalNote}</span>
            </div>
            <div className="text-right">
              <span className="text-[28px] font-extrabold text-[#2563EB] tracking-tight tabular-nums">
                {totalLyd(totals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          {phase === "done" ? (
            <Link
              to={`/booking-confirmed/${vehicle.id}`}
              className="w-full py-4 px-6 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[16px] font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              <CheckoutIcon name="check" className="w-5 h-5" />
              View Booking Confirmation
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={phase === "processing"}
              className={`w-full py-4 px-6 rounded-xl text-white text-[16px] font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                phase === "processing"
                  ? "bg-[#2563EB] opacity-80 cursor-not-allowed"
                  : "bg-[#2563EB] hover:bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
              }`}
            >
              {phase === "processing" ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {meta.ctaProcessing}
                </>
              ) : (
                <>
                  {meta.ctaIdle(totals.total)}
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          )}
          <div className="flex flex-col gap-2 text-center">
            <p className="text-[11px] text-[#64748B] flex items-center justify-center gap-1.5">
              <Shield className="w-[14px] h-[14px] text-[#2563EB]" />
              {meta.secureNote}
            </p>
            <p className="text-[10px] text-[#94A3B8] leading-tight">
              {meta.agreementNote(vehicle.operator.name)}
            </p>
          </div>
        </div>

        {/* Mini value props */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {meta.valueProps.map((prop) => (
            <div
              key={prop.title}
              className="p-2.5 rounded-lg bg-[#F8FAFC] text-center flex flex-col items-center gap-1"
            >
              <CheckoutIcon name={prop.icon} className="w-[18px] h-[18px] text-[#2563EB]" />
              <span className="text-[11px] font-bold text-[#0F172A]">{prop.title}</span>
              <span className="text-[10px] text-[#94A3B8]">{prop.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;