import React from "react";
import { useTranslation } from "react-i18next";
import {
  CarFront,
  CalendarDays,
  Fuel,
  Gauge,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { companyLogoUrl, initialsFrom, photoUrl } from "../../lib/vehicleMapper";
import {
  providerOf,
  rentalDays,
  vehicleRefOf,
  vehicleTitle,
} from "../../lib/bookingView";

interface VehicleCardProps {
  booking: BookingDto;
}

const FUEL_KEYS: Record<string, string> = {
  DIESEL: "diesel",
  HYBRID: "hybrid",
  ELECTRIC: "electric",
  GASOLINE: "gasoline",
  PETROL: "gasoline",
};

const TRANSMISSION_KEYS: Record<string, string> = {
  AUTOMATIC: "automatic",
  MANUAL: "manual",
};

export const VehicleCard: React.FC<VehicleCardProps> = ({ booking }) => {
  const { t } = useTranslation();

  const vehicle = vehicleRefOf(booking);
  const vehicleId =
    typeof booking.vehicleId === "object" ? booking.vehicleId._id : booking.vehicleId;
  const provider = providerOf(booking);
  const title = vehicleTitle(booking);
  const photo = photoUrl(vehicle?.photos?.[0]);
  const year = vehicle?.year;
  const days = rentalDays(booking.startDate, booking.endDate);

  const specs: {
    key: string;
    icon: React.ReactNode;
    value?: string | number;
  }[] = [
    {
      key: "fuel",
      icon: <Fuel className="w-5 h-5" />,
      value: vehicle?.fuelType
        ? t(
            `myBookings.chips.${
              FUEL_KEYS[String(vehicle.fuelType).toUpperCase()] ?? "gasoline"
            }`,
          )
        : "—",
    },
    {
      key: "transmission",
      icon: <Gauge className="w-5 h-5" />,
      value: vehicle?.transmission
        ? t(
            `myBookings.chips.${
              TRANSMISSION_KEYS[String(vehicle.transmission).toUpperCase()] ??
              "automatic"
            }`,
          )
        : "—",
    },
    {
      key: "year",
      icon: <CalendarDays className="w-5 h-5" />,
      value: year ?? "—",
    },
    {
      key: "pickupMethod",
      icon: booking.pickupMethod === "DELIVERY" ? <Truck className="w-5 h-5" /> : <MapPin className="w-5 h-5" />,
      value: t(`bookingDetails.vehicle.pickupMethod.${booking.pickupMethod}`),
    },
  ];

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 flex items-center justify-between gap-3 bg-[#F1F5F9]">
        <div className="flex items-center gap-3 min-w-0">
          <CarFront className="w-7 h-7 text-[#2563EB] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[#2563EB] font-bold uppercase tracking-wide">
              {t("bookingDetails.vehicle.label")}
            </span>
            <h2 className="text-[18px] font-extrabold text-[#0F172A] leading-tight truncate">
              {title}
            </h2>
          </div>
        </div>
        {year && (
          <span className="px-3 py-1 bg-white text-[#0F172A] text-xs font-bold rounded-lg shadow-sm shrink-0">
            {t("bookingDetails.vehicle.model", { year })}
          </span>
        )}
      </div>

      {/* Image + vehicle identity banner */}
      <div className="relative w-full h-64 md:h-80 bg-[#F1F5F9] overflow-hidden">
        <img
          src={photo}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-[#0F172A]/80 backdrop-blur-md px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#F9A825]" />
              <span className="text-[11px]">{t("bookingDetails.vehicle.vinLabel")}:</span>
              <span className="font-mono text-[#F9A825] font-bold tracking-wider" dir="ltr">
                {vehicleId ? vehicleId.slice(-12).toUpperCase() : "—"}
              </span>
            </div>
            <span className="bg-emerald-500/90 text-white text-[11px] px-3 py-1 rounded-full font-bold">
              {t("bookingDetails.vehicle.guarantee")}
            </span>
          </div>
        </div>
      </div>

      {/* Technical specs bento */}
      <div className="p-5 lg:p-6 flex flex-col gap-5">
        <h3 className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
          {t("bookingDetails.vehicle.specTitle")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {specs.map((spec) => (
            <div
              key={spec.key}
              className="p-3 bg-[#F8FAFC] rounded-xl flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 text-[#2563EB]">
                <span className="h-6 w-6">{spec.icon}</span>
              </div>
              <span className="text-[11px] text-[#64748B] font-semibold">
                {t(`bookingDetails.vehicle.specs.${spec.key}.label`)}
              </span>
              <span className="text-[14px] font-bold text-[#0F172A] leading-snug">
                {spec.value}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                {t(`bookingDetails.vehicle.specs.${spec.key}.sub`)}
              </span>
            </div>
          ))}
        </div>

        {/* Partner profile */}
        {provider && (
          <div className="p-4 bg-[#EFF4FF] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {companyLogoUrl(provider.logo) ? <img src={companyLogoUrl(provider.logo) ?? ""} alt={provider.name ?? ""} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-[18px] shrink-0">{initialsFrom(provider.name ?? "N")}</div>}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-bold text-[#0F172A]">
                    {provider.name}
                  </span>
                  <span className="px-2 py-0.5 bg-[#FFF7ED] text-[#9A3412] rounded text-[11px] font-bold inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#F97316]" />
                    {t("bookingDetails.vehicle.partnerVerified")}
                  </span>
                </div>
                <span className="text-[12px] text-[#64748B]">
                  {t("myBookings.days", { days })}
                </span>
              </div>
            </div>
            {provider.phone && (
              <a
                href={`tel:${provider.phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:text-[#2563EB] rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                <Phone className="w-4 h-4 text-[#2563EB]" />
                <span dir="ltr">{provider.phone}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default VehicleCard;
