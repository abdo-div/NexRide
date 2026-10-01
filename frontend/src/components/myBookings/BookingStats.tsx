import React from "react";
import { useTranslation } from "react-i18next";
import { CarFront, CalendarClock, Wallet, Crown } from "lucide-react";
import type { BookingDto, PaymentStatus } from "../../types/booking";
import { formatLYD } from "../../lib/bookingView";

interface BookingStatsProps {
  bookings: BookingDto[];
  /** VIP loyalty points derived from the settled ledger. */
  points: number;
}

const PAID_PAYMENT_STATUSES: PaymentStatus[] = ["PAID", "REFUNDED"];

const isPaid = (booking: BookingDto): boolean =>
  PAID_PAYMENT_STATUSES.includes(booking.paymentStatus) ||
  booking.bookingStatus === "COMPLETED";

export const BookingStats: React.FC<BookingStatsProps> = ({
  bookings,
  points,
}) => {
  const { t } = useTranslation();

  const total = bookings.length;
  const active = bookings.filter(
    (booking) =>
      !["COMPLETED", "CANCELLED", "EXPIRED"].includes(booking.bookingStatus),
  ).length;
  const totalPaid = bookings
    .filter(isPaid)
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

  const currency = t("myBookings.currency");
  const paidFormatted = formatLYD(totalPaid);

  const cards: {
    key: string;
    label: string;
    value: string;
    suffix: string;
    note: string;
    live?: boolean;
    icon: React.ReactNode;
    tileClass: string;
    valueClass: string;
  }[] = [
    {
      key: "total",
      label: t("myBookings.totalLabel"),
      value: String(total),
      suffix: t("myBookings.totalTrips"),
      note: "",
      icon: <CarFront className="w-6 h-6" />,
      tileClass: "bg-[#EFF2F7] text-[#2563EB]",
      valueClass: "text-[#0F172A]",
    },
    {
      key: "active",
      label: t("myBookings.activeLabel"),
      value: String(active),
      suffix: t("myBookings.activeConfirmed"),
      note: "",
      live: true,
      icon: <CalendarClock className="w-6 h-6" />,
      tileClass: "bg-[#ECFDF5] text-emerald-700",
      valueClass: "text-[#2563EB]",
    },
    {
      key: "paid",
      label: t("myBookings.paidLabel"),
      value: paidFormatted,
      suffix: currency,
      note: t("myBookings.paidNote"),
      icon: <Wallet className="w-6 h-6" />,
      tileClass: "bg-[#EFF6FF] text-[#2563EB]",
      valueClass: "text-[#0F172A]",
    },
    {
      key: "points",
      label: t("myBookings.pointsLabel"),
      value: formatLYD(points),
      suffix: t("myBookings.pointsSuffix"),
      note: t("myBookings.pointsNote"),
      icon: <Crown className="w-6 h-6" />,
      tileClass: "bg-[#FFF7ED] text-[#F97316]",
      valueClass: "text-[#0F172A]",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] flex items-center justify-between gap-3"
        >
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] text-[#64748B] font-medium">
                {card.label}
              </span>
              {card.live && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {t("myBookings.activeLive")}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span
                className={`text-[26px] font-extrabold tracking-tight tabular-nums ${card.valueClass}`}
              >
                {card.value}
              </span>
              <span className="text-[11px] text-[#64748B] font-semibold">
                {card.suffix}
              </span>
            </div>
            {card.note && (
              <span className="mt-0.5 text-[11px] text-[#94A3B8] font-medium truncate">
                {card.note}
              </span>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.tileClass}`}
            aria-hidden="true"
          >
            {card.icon}
          </div>
        </div>
      ))}
    </section>
  );
};

export default BookingStats;