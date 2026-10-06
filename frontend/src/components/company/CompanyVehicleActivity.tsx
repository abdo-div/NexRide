import React from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleTrip } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehicleActivityProps {
  trips: CompanyVehicleTrip[];
  lang: string;
}

const shortDate = (iso: string, lang: string): string =>
  new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    ...(lang.startsWith("ar") ? {} : { year: "numeric" }),
  }).format(new Date(iso));

/**
 * Recent activity — a real timeline built from this vehicle's own trip ledger
 * (the mock's hand-written audit log isn't fabricated). Each event is one
 * booking: confirmed/reserved or returned, dated and valued.
 */
export const CompanyVehicleActivity: React.FC<CompanyVehicleActivityProps> = ({
  trips,
  lang,
}) => {
  const { t } = useTranslation();
  const events = trips.slice(0, 4);

  return (
    <SectionCard
      icon={History}
      iconStyle="bg-[#E5EEFF] text-[#2563EB]"
      title={t("company.vehiclePage.act.title")}
      titleAr={t("company.vehiclePage.act.titleAr")}
    >
      {events.length === 0 ? (
        <p className="text-sm text-[#9AA4B5]">{t("company.vehiclePage.act.empty")}</p>
      ) : (
        <div className="relative flex flex-col gap-4 pl-5">
          <div className="absolute bottom-2 left-2 top-2 w-0.5 bg-[#E5EEFF]" />
          {events.map((trip) => {
            const completed = trip.bookingStatus === "COMPLETED";
            const dateIso = completed ? trip.endDate : trip.startDate;
            const dot = completed
              ? "bg-[#0BA05F]"
              : trip.bookingStatus === "PENDING_PAYMENT"
                ? "bg-[#EA8A00]"
                : "bg-[#2563EB]";
            return (
              <div key={trip.id} className="relative flex flex-col">
                <span
                  className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot}`}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0B1C30]">
                    {t(
                      completed
                        ? "company.vehiclePage.act.completed"
                        : "company.vehiclePage.act.confirmed",
                      { reference: trip.reference },
                    )}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-[#9AA4B5]">
                    {shortDate(dateIso, lang)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[#5C647A]">
                  {t("company.vehiclePage.act.details", {
                    customer: trip.customer.name || "—",
                    date: shortDate(trip.startDate, lang),
                    amount: formatLYD(trip.totalAmount),
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

export default CompanyVehicleActivity;