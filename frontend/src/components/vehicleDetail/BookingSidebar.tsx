import React from "react";
import { useNavigate } from "react-router";
import { Bolt, CheckCircle2, ShieldCheck, Lock, Info, Headphones, ArrowRight } from "lucide-react";
import { DetailIcon } from "./iconMap";
import type { VehicleDetail } from "../../types/vehicleDetail";

const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export const BookingSidebar: React.FC<{ detail: VehicleDetail }> = ({ detail }) => {
  const navigate = useNavigate();
  const [pickupDate, setPickupDate] = React.useState(detail.booking.pickupDefault);
  const [returnDate, setReturnDate] = React.useState(detail.booking.returnDefault);
  const [pickupTime, setPickupTime] = React.useState(detail.booking.pickupTimes[2] ?? "");
  const [returnTime, setReturnTime] = React.useState(detail.booking.returnTimes[1] ?? "");
  const [delivery, setDelivery] = React.useState(detail.booking.deliveryPoints[0] ?? "");
  const [protection, setProtection] = React.useState(detail.protectionPlans[0]?.id ?? "standard");

  const plan = detail.protectionPlans.find((p) => p.id === protection) ?? detail.protectionPlans[0];
  const days = Math.max(daysBetween(pickupDate, returnDate), detail.minDays);
  const rate = detail.vehicle.pricePerDay + (plan?.pricePerDay ?? 0);
  const gross = days * rate;

  const reserve = () => navigate(`/checkout/${detail.id}`);

  const trustIcons = { check: CheckCircle2, lock: Lock, shield: ShieldCheck };

  const selectCls =
    "w-full bg-white border border-[#E2E8F0] text-[#0F172A] text-[12px] px-2.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]";

  return (
    <aside className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[36px] font-extrabold text-[#0F172A] tracking-tight tabular-nums">
                {detail.vehicle.pricePerDay.toLocaleString()}
              </span>
              <span className="text-[15px] text-[#0F172A] font-bold">LYD</span>
              <span className="text-[13px] text-[#64748B]">/ day</span>
            </div>
            <p className="text-[12px] text-[#F97316] font-bold flex items-center gap-1 mt-0.5">
              <Bolt className="w-[15px] h-[15px] text-[#F97316]" />
              Instant Confirmation Active
            </p>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
              Min. {detail.minDays} Days
            </span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-1">
                Pick-up Date
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className={selectCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-1">
                Time
              </label>
              <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={selectCls}>
                {detail.booking.pickupTimes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className={selectCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-1">
                Time
              </label>
              <select value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={selectCls}>
                {detail.booking.returnTimes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-1">
              Delivery / Handover Point
            </label>
            <select value={delivery} onChange={(e) => setDelivery(e.target.value)} className={selectCls}>
              {detail.booking.deliveryPoints.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider block mb-2">
            Select Protection Package
          </label>
          <div className="space-y-2">
            {detail.protectionPlans.map((p) => (
              <label
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="protection"
                    checked={protection === p.id}
                    onChange={() => setProtection(p.id)}
                    className="accent-[#2563EB] w-4 h-4"
                  />
                  <div>
                    <span className="text-[13px] font-bold text-[#0F172A] block">{p.name}</span>
                    <span className="text-[12px] text-[#64748B]">{p.description}</span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                    p.included
                      ? "text-[#0F172A] bg-white border-[#E2E8F0]"
                      : "text-[#2563EB] bg-blue-50 border-blue-200"
                  }`}
                >
                  {p.priceNote}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-6 pt-2 text-[13px] text-[#64748B]">
          <div className="flex justify-between">
            <span>
              {days} Days Duration × {rate.toLocaleString()} LYD
            </span>
            <span className="font-semibold text-[#0F172A] tabular-nums">{gross.toLocaleString()} LYD</span>
          </div>
          {detail.freeIncluded.map((line) => (
            <div key={line} className="flex justify-between">
              <span>{line}</span>
              <span className="font-bold text-[#2563EB]">Included</span>
            </div>
          ))}
          <div className="flex justify-between pb-2">
            <span className="flex items-center gap-1">
              {detail.deposit.label}
              <Info className="w-[14px] h-[14px] text-[#94A3B8]" />
            </span>
            <span className="font-semibold text-[#0F172A]">{detail.deposit.amount}</span>
          </div>
          <div className="flex items-center justify-between pt-3 text-[#0F172A] font-bold bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-2xl">
            <div>
              <span className="block text-[12px] font-normal text-[#64748B]">Total Payable Now</span>
              <span className="text-[16px] font-bold text-[#0F172A]">Total:</span>
            </div>
            <div className="text-right">
              <span className="text-[#2563EB] text-[28px] font-extrabold leading-none tabular-nums">
                {gross.toLocaleString()}
              </span>
              <span className="text-[#0F172A] text-[13px] ml-1">LYD</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={reserve}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-extrabold tracking-wide shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group bg-[#2563EB] hover:bg-blue-700"
        >
          {detail.reserveLabel}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-4 space-y-2 pt-2 text-[#64748B] text-[12px]">
          {detail.trustSignals.map((t) => {
            const Icon = trustIcons[t.icon];
            return (
              <div key={t.text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#2563EB]" />
                {t.text}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#0F172A]">{detail.liveStatus.label} Aid</p>
            <p className="text-[12px] text-[#64748B]">
              {detail.liveStatus.color === "amber"
                ? "Armored B6 convoy packages on request"
                : "24/7 dispatch hotline available"}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#2563EB] text-[12px] font-bold transition-colors"
        >
          Inquire
        </button>
      </div>

      {plan && (
        <div className="hidden lg:flex items-center justify-between text-[11px] text-[#64748B] px-1">
          <DetailIcon name="life" className="w-4 h-4 text-[#2563EB]" />
          <span>{plan.name} applied to this quote</span>
        </div>
      )}
    </aside>
  );
};