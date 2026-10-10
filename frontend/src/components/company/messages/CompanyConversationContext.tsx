import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange, Car, Hash, MapPin, Phone, Wallet } from "lucide-react";
import { userPhotoUrl } from "../../../lib/customerView";
import { photoUrl } from "../../../lib/vehicleMapper";
import { formatLYD } from "../../../lib/bookingView";
import { rangeLabel } from "../../../lib/messagesView";
import type { CompanyConversationThread } from "../../../types/companyMessages";

interface CompanyConversationContextProps {
  thread: CompanyConversationThread | null;
  lang: string;
}

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-[#8A93A6]">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A93A6]">
        {label}
      </p>
      <p className="truncate text-[13px] font-semibold text-[#0B1C30]">{value}</p>
    </div>
  </div>
);

export const CompanyConversationContext: React.FC<
  CompanyConversationContextProps
> = ({ thread, lang }) => {
  const { t } = useTranslation();

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <p className="text-[13px] text-[#8A93A6]">
          {t("company.messagesPage.context.empty")}
        </p>
      </div>
    );
  }

  const { conversation } = thread;
  const { customer, booking } = conversation;
  const avatar = userPhotoUrl(customer.photo ?? undefined);
  const vehicle = booking?.vehicle;
  const vehicleLabel = vehicle
    ? [vehicle.make, vehicle.model, vehicle.year ? `(${vehicle.year})` : ""]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Renter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <p className="text-[13px] font-bold text-[#0B1C30]">
          {t("company.messagesPage.context.renterTitle")}
        </p>
        <div className="mt-4 flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={customer.name}
              className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
              {customer.initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#0B1C30]">
              {customer.name}
            </p>
            <p className="truncate text-[12px] text-[#8A93A6]">
              {twoLineSubject(conversation.subject)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Row
            icon={<Phone className="h-4 w-4" aria-hidden="true" />}
            label={t("company.messagesPage.context.phone")}
            value={
              customer.phoneNumber ||
              t("company.messagesPage.context.phoneUnavailable")
            }
          />
        </div>
      </div>

      {/* Active reservation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <p className="text-[13px] font-bold text-[#0B1C30]">
          {t("company.messagesPage.context.bookingTitle")}
        </p>

        {booking ? (
          <>
            {vehicle && vehicle.photo && (
              <img
                src={photoUrl(vehicle.photo)}
                alt={vehicleLabel}
                className="mt-3 h-28 w-full rounded-xl border border-slate-200 object-cover"
              />
            )}
            <div className="mt-4 space-y-3">
              <Row
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                label={t("company.messagesPage.context.reference")}
                value={booking.reference}
              />
              {vehicleLabel && (
                <Row
                  icon={<Car className="h-4 w-4" aria-hidden="true" />}
                  label={t("company.messagesPage.context.vehicle")}
                  value={vehicleLabel}
                />
              )}
              <Row
                icon={<CalendarRange className="h-4 w-4" aria-hidden="true" />}
                label={t("company.messagesPage.context.dates")}
                value={rangeLabel(booking.startDate, booking.endDate, lang)}
              />
              <Row
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                label={t("company.messagesPage.context.pickup")}
                value={
                  booking.pickupLocation ||
                  t("company.messagesPage.context.pickupUnavailable")
                }
              />
              {booking.totalAmount !== null && (
                <Row
                  icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                  label={t("company.messagesPage.context.total")}
                  value={`${formatLYD(booking.totalAmount)} LYD`}
                />
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 text-[13px] text-[#8A93A6]">
            {t("company.messagesPage.context.noBooking")}
          </p>
        )}
      </div>
    </div>
  );
};

const twoLineSubject = (subject: string): string => subject;

export default CompanyConversationContext;