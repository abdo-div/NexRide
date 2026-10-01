import React from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CircleCheck,
  Flag,
  Map,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { formatDate, rentalDays } from "../../lib/bookingView";

interface RouteMapSectionProps {
  booking: BookingDto;
}

export const RouteMapSection: React.FC<RouteMapSectionProps> = ({ booking }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const days = rentalDays(booking.startDate, booking.endDate);

  const stopCard = (
    variant: "pickup" | "return",
    date: string,
    location: string,
    desc: string,
  ) => (
    <div className="bg-[#F8FAFC] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
            variant === "pickup"
              ? "bg-[#EFF4FF] text-[#2563EB]"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {variant === "pickup" ? (
            <MapPin className="w-3.5 h-3.5" />
          ) : (
            <Flag className="w-3.5 h-3.5" />
          )}
          {t(
            variant === "pickup"
              ? "bookingDetails.route.pickupBadge"
              : "bookingDetails.route.returnBadge",
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#64748B]">
          <CalendarClock className="w-3.5 h-3.5" />
          {date}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-extrabold text-[#0F172A]">
          {location || "—"}
        </span>
        <span className="text-[12px] text-[#64748B] leading-relaxed">{desc}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {variant === "pickup" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            <CircleCheck className="w-3 h-3" />
            {t("bookingDetails.route.quick")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            <ShieldCheck className="w-3 h-3" />
            {t("bookingDetails.route.depositRelease")}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 lg:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[17px] font-bold text-[#0F172A] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center">
            <Map className="w-4 h-4" />
          </span>
          {t("bookingDetails.route.title")}
        </h2>
        <span className="text-[12px] font-bold text-[#0F172A] bg-[#F1F5F9] px-3 py-1.5 rounded-full">
          {t("bookingDetails.route.duration", {
            days,
            totalHours: days * 24,
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stopCard(
          "pickup",
          formatDate(booking.startDate, lang),
          booking.pickupLocation,
          t("bookingDetails.route.pickupDesc"),
        )}
        {stopCard(
          "return",
          formatDate(booking.endDate, lang),
          booking.pickupLocation,
          t("bookingDetails.route.returnDesc"),
        )}
      </div>

      {/* Decorative map panel */}
      <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200">
        <div className="absolute inset-0 bg-[#E8EEF8]">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          {/* Decor roads */}
          <div className="absolute left-0 right-0 top-[38%] h-3 bg-white rotate-[-4deg] shadow-sm" />
          <div className="absolute left-0 right-0 top-[62%] h-2 bg-[#BFDBFE] rotate-[7deg] shadow-sm" />
          <div className="absolute top-0 bottom-0 left-[42%] w-4 bg-white -rotate-6 shadow-sm" />
          {/* Pickup marker */}
          <div className="absolute top-[28%] start-[20%] flex flex-col items-center gap-1">
            <span className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg">
              <MapPin className="w-4 h-4" />
            </span>
            <span className="px-2 py-0.5 bg-white rounded-md text-[10px] font-bold text-[#0F172A] shadow">
              {t("bookingDetails.route.pickupBadge")}
            </span>
          </div>
          {/* Return marker */}
          <div className="absolute top-[30%] end-[20%] flex flex-col items-center gap-1">
            <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
              <Flag className="w-4 h-4" />
            </span>
            <span className="px-2 py-0.5 bg-white rounded-md text-[10px] font-bold text-[#0F172A] shadow">
              {t("bookingDetails.route.returnBadge")}
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white/95 to-transparent px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F172A]">
            <CircleCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            {t("bookingDetails.route.parkingBadge")}
          </span>
          <span className="text-[11px] text-[#64748B]">
            {t("bookingDetails.route.parkingDesc")}
          </span>
        </div>
      </div>
    </section>
  );
};

export default RouteMapSection;