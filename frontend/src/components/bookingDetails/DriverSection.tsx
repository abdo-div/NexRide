import React from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { initialsFrom } from "../../lib/vehicleMapper";

interface DriverSectionProps {
  booking: BookingDto;
}

export const DriverSection: React.FC<DriverSectionProps> = ({ booking }) => {
  const { t } = useTranslation();
  const customer =
    typeof booking.customerId === "object" ? booking.customerId : null;
  const name = customer?.name || "";
  const phone = customer?.phoneNumber || "";
  const email = customer?.email || "";

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 lg:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[17px] font-bold text-[#0F172A] flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center">
            <UserRound className="w-4 h-4" />
          </span>
          {t("bookingDetails.driver.title")}
        </h2>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t("bookingDetails.driver.verified")}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Renter */}
        <div className="bg-[#F8FAFC] rounded-xl p-5 flex flex-col gap-3">
          <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wide">
            {t("bookingDetails.driver.renterLabel")}
          </span>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold shrink-0">
              {initialsFrom(name || "?")}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-extrabold text-[#0F172A] truncate">
                {name || "—"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <BadgeCheck className="w-3.5 h-3.5" />
                {t("bookingDetails.driver.licenseChip")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#475569] flex-wrap">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-[#2563EB] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                <span dir="ltr">{phone}</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 font-semibold hover:text-[#2563EB] transition-colors truncate"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="truncate">{email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Protocol */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-xl p-5 text-white flex flex-col gap-3">
          <span className="text-[11px] font-bold text-[#F9A825] uppercase tracking-wide">
            {t("bookingDetails.driver.protocolLabel")}
          </span>
          <p className="text-[13px] text-slate-300 leading-relaxed">
            {t("bookingDetails.driver.protocolBody")}
          </p>
          <span className="self-start inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/15 text-emerald-300 rounded-full text-[11px] font-bold">
            <BadgeCheck className="w-3.5 h-3.5" />
            {t("bookingDetails.driver.protocolChip")}
          </span>
        </div>
      </div>
    </section>
  );
};

export default DriverSection;