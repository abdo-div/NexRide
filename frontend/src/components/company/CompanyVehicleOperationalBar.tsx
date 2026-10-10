import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, MapPin, Star } from "lucide-react";
import type { CompanyVehicleData } from "../../types/companyVehicle";

interface CompanyVehicleOperationalBarProps {
  data: CompanyVehicleData;
}

/**
 * Quick operational summary (4 cards). The mock's odometer / fuel / condition
 * panels are replaced with metrics we can actually compute from the vehicle
 * document and its own booking ledger — no telemetry is fabricated.
 */
export const CompanyVehicleOperationalBar: React.FC<
  CompanyVehicleOperationalBarProps
> = ({ data }) => {
  const { t } = useTranslation();
  const { vehicle, metrics } = data;
  const hub = vehicle.pickupLocation ?? vehicle.city;

  const cards = [
    {
      label: t("company.vehiclePage.ops.completed"),
      icon: CheckCircle2,
      iconStyle: "text-[#0BA05F]",
      main: String(metrics.bookings.completed),
      sub: `${t("company.vehiclePage.ops.rides")} • ${t("company.vehiclePage.ops.allTime")}`,
    },
    {
      label: t("company.vehiclePage.ops.gps"),
      icon: MapPin,
      iconStyle: "text-[#2563EB]",
      main: vehicle.gpsActive
        ? t("company.vehiclePage.ops.online")
        : t("company.vehiclePage.ops.offline"),
      sub: hub ?? "—",
      live: vehicle.gpsActive,
    },
    {
      label: t("company.vehiclePage.ops.days"),
      icon: Clock3,
      iconStyle: "text-[#8E5E00]",
      main: String(metrics.rentalDays),
      sub: `${metrics.financial.trips} ${t("company.vehiclePage.ops.trips")}`,
    },
    {
      label: t("company.vehiclePage.ops.rating"),
      icon: Star,
      iconStyle: "text-[#B54E00]",
      main:
        vehicle.rating.average !== null
          ? vehicle.rating.average.toFixed(2)
          : "—",
      sub: t("company.vehiclePage.ops.reviews", {
        count: vehicle.rating.count,
      }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between text-[#565E74]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {card.label}
            </span>
            <card.icon className={`h-[18px] w-[18px] ${card.iconStyle}`} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
              {card.main}
              {card.live && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0BA05F] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0BA05F]" />
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#565E74]">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyVehicleOperationalBar;