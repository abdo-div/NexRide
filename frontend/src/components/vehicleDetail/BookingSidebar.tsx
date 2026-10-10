import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Bolt, CheckCircle2, ShieldCheck, Lock, Info, Headphones, ArrowRight } from "lucide-react";
import { DetailIcon } from "./iconMap";
import { bookingApi } from "../../lib/bookingApi";
import type { VehicleDetail } from "../../types/vehicleDetail";

const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export const BookingSidebar: React.FC<{ detail: VehicleDetail }> = ({ detail }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pickupDate, setPickupDate] = React.useState(detail.booking.pickupDefault);
  const [returnDate, setReturnDate] = React.useState(detail.booking.returnDefault);
  const [pickupTime, setPickupTime] = React.useState(detail.booking.pickupTimes[2] ?? "");
  const [returnTime, setReturnTime] = React.useState(detail.booking.returnTimes[1] ?? "");
  const [delivery, setDelivery] = React.useState(detail.booking.deliveryPoints[0] ?? "");
  const [protection, setProtection] = React.useState(detail.protectionPlans[0]?.id ?? "standard");
  const [check, setCheck] = React.useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [checkError, setCheckError] = React.useState<string | null>(null);

  const plan = detail.protectionPlans.find((p) => p.id === protection) ?? detail.protectionPlans[0];
  const days = Math.max(daysBetween(pickupDate, returnDate), detail.minDays);
  const rate = detail.vehicle.pricePerDay + (plan?.pricePerDay ?? 0);
  const gross = days * rate;

  const submitDates = React.useCallback(() => setCheck("idle"), []);

  const runCheck = async () => {
    setCheckError(null);
    if (!pickupDate || !returnDate || returnDate <= pickupDate) {
      setCheckError(t("vehicleDetail.invalidDates"));
      setCheck("unavailable");
      return;
    }
    setCheck("checking");
    try {
      const result = await bookingApi.checkAvailability(detail.id, pickupDate, returnDate);
      setCheck(result.data.isAvailable ? "available" : "unavailable");
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "");
      setCheck("unavailable");
    }
  };

  const continueToCheckout = () => {
    const params = new URLSearchParams({
      startDate: pickupDate,
      endDate: returnDate,
      startTime: pickupTime,
      endTime: returnTime,
      location: t(delivery),
    });
    navigate(`/checkout/${detail.id}?${params.toString()}`);
  };

  const onPrimaryClick = () => {
    if (check === "available") {
      continueToCheckout();
      return;
    }
    void runCheck();
  };

  const primaryLabel =
    check === "checking"
      ? t("vehicleDetail.checkingAvailability")
      : check === "available"
        ? t("vehicleDetail.continueToCheckout")
        : t("vehicleDetail.checkAvailability");

  const trustIcons = { check: CheckCircle2, lock: Lock, shield: ShieldCheck };

  const selectCls =
    "w-full bg-white border border-[#E2E8F0] text-[#0F172A] text-[12px] px-2.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]";

  const labelCls = "block mb-1 text-[11px] text-[#64748B] font-bold uppercase tracking-wider";

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
              <span className="text-[13px] text-[#64748B]">{t("vehicleDetail.perDay")}</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#F97316] font-bold">
              {detail.isReservable !== false && (
                <>
                  <Bolt className="w-[15px] h-[15px] text-[#F97316]" />
                  {t("vehicleDetail.instantConfirmationActive")}
                </>
              )}
            </p>
          </div>
          <div className="text-end">
            <span className="px-2.5 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
              {t("vehicleDetail.minDays", { days: detail.minDays })}
            </span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <label className={labelCls}>{t("vehicleDetail.pickupDate")}</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => {
                  setPickupDate(e.target.value);
                  submitDates();
                }}
                className={selectCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("home.search.time")}</label>
              <select value={pickupTime} onChange={(e) => { setPickupTime(e.target.value); submitDates(); }} className={selectCls}>
                {detail.booking.pickupTimes.map((time) => (
                  <option key={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <label className={labelCls}>{t("vehicleDetail.returnDate")}</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  submitDates();
                }}
                className={selectCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("home.search.time")}</label>
              <select value={returnTime} onChange={(e) => { setReturnTime(e.target.value); submitDates(); }} className={selectCls}>
                {detail.booking.returnTimes.map((time) => (
                  <option key={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("vehicleDetail.deliveryPoint")}</label>
            <select value={delivery} onChange={(e) => { setDelivery(e.target.value); submitDates(); }} className={selectCls}>
              {detail.booking.deliveryPoints.map((d) => (
                <option key={d}>{t(d)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-[11px] text-[#64748B] font-bold uppercase tracking-wider">
            {t("vehicleDetail.selectProtection")}
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
                    <span className="block text-[13px] font-bold text-[#0F172A]">{t(p.name)}</span>
                    <span className="text-[12px] text-[#64748B]">{t(p.description)}</span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                    p.included
                      ? "text-[#0F172A] bg-white border-[#E2E8F0]"
                      : "text-[#2563EB] bg-blue-50 border-blue-200"
                  }`}
                >
                  {t(p.priceNote)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-6 pt-2 text-[13px] text-[#64748B]">
          <div className="flex justify-between">
            <span>{t("vehicleDetail.durationRate", { days, rate: rate.toLocaleString() })}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">{gross.toLocaleString()} LYD</span>
          </div>
          {detail.freeIncluded.map((line) => (
            <div key={line} className="flex justify-between">
              <span>{t(line)}</span>
              <span className="font-bold text-[#2563EB]">{t("vehicleDetail.included")}</span>
            </div>
          ))}
          <div className="flex justify-between pb-2">
            <span className="flex items-center gap-1">
              {t(detail.deposit.label)}
              <Info className="w-[14px] h-[14px] text-[#94A3B8]" />
            </span>
            <span className="font-semibold text-[#0F172A]">{t(detail.deposit.amount)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 text-[#0F172A] font-bold bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 rounded-2xl">
            <div>
              <span className="block text-[12px] font-normal text-[#64748B]">
                {t("vehicleDetail.totalPayableNow")}
              </span>
              <span className="text-[16px] font-bold text-[#0F172A]">{t("vehicleDetail.totalLabel")}</span>
            </div>
            <div className="text-end">
              <span className="text-[#2563EB] text-[28px] font-extrabold leading-none tabular-nums">
                {gross.toLocaleString()}
              </span>
              <span className="ms-1 text-[#0F172A] text-[13px]">LYD</span>
            </div>
          </div>
        </div>

        {check === "available" && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t("vehicleDetail.availableForDates")}
          </div>
        )}
        {check === "unavailable" && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-semibold">
            <p className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              {t("vehicleDetail.notAvailableForDates")}
            </p>
            {checkError && <p className="mt-1 ps-6 text-[11px] font-normal">{checkError}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={detail.isReservable === false || check === "checking"}
          className={`w-full py-4 rounded-2xl text-white text-[15px] font-extrabold tracking-wide shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group ${
            detail.isReservable === false || check === "checking"
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-[#2563EB] hover:bg-blue-700"
          }`}
        >
          {check === "checking" && (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {detail.isReservable === false
            ? t("vehicleDetail.reserveUnavailable")
            : primaryLabel}
          {check !== "checking" && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
          )}
        </button>

        <div className="mt-4 space-y-2 pt-2 text-[#64748B] text-[12px]">
          {detail.trustSignals.map((signal) => {
            const Icon = trustIcons[signal.icon];
            return (
              <div key={signal.text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#2563EB]" />
                {t(signal.text)}
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
            <p className="text-[13px] font-bold text-[#0F172A]">
              {t("vehicleDetail.conciergeAid", { status: t(detail.liveStatus.label) })}
            </p>
            <p className="text-[12px] text-[#64748B]">
              {detail.liveStatus.color === "amber"
                ? t("vehicleDetail.armoredConvoy")
                : t("vehicleDetail.dispatchHotline")}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#2563EB] text-[12px] font-bold transition-colors"
        >
          {t("vehicleDetail.inquire")}
        </button>
      </div>

      {plan && (
        <div className="hidden lg:flex items-center justify-between text-[11px] text-[#64748B] px-1">
          <DetailIcon name="life" className="w-4 h-4 text-[#2563EB]" />
          <span>{t("vehicleDetail.planApplied", { plan: t(plan.name) })}</span>
        </div>
      )}
    </aside>
  );
};
