import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CircleCheck,
  CircleAlert,
  Download,
  FileText,
  Fuel,
  Gauge,
  Map,
  MapPin,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  Star,
  Store,
  CircleX,
  Eye,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { photoUrl } from "../../lib/vehicleMapper";
import { bookingApi } from "../../lib/bookingApi";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
  rentalDays,
  saveBlobAsFile,
  vehicleRefOf,
  vehicleTitle,
  daysUntil,
  providerOf,
} from "../../lib/bookingView";

interface BookingCardProps {
  booking: BookingDto;
  onToast: (message: string) => void;
  onCancelled: () => void;
}

const TRANSMISSION_KEYS: Record<string, string> = {
  AUTOMATIC: "automatic",
  MANUAL: "manual",
};

const FUEL_KEYS: Record<string, string> = {
  DIESEL: "diesel",
  HYBRID: "hybrid",
  ELECTRIC: "electric",
  GASOLINE: "gasoline",
  PETROL: "gasoline",
};

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onToast,
  onCancelled,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const status = booking.bookingStatus;
  const lang = i18n.language;
  const vehicle = vehicleRefOf(booking);
  const vehicleId =
    typeof booking.vehicleId === "object" ? booking.vehicleId._id : booking.vehicleId;
  const provider = providerOf(booking);
  const title = vehicleTitle(booking);
  const ref = referenceCodeFrom(booking._id);
  const currency = t("myBookings.currency");
  const days = rentalDays(booking.startDate, booking.endDate);
  const totalHours = Math.max(days * 24, 24);
  const invoiceAvailable = booking.paymentStatus === "PAID";

  const isActive = status === "ACTIVE";
  const isUpcoming = status === "CONFIRMED" || status === "PAID";
  const isPendingPayment = status === "PENDING_PAYMENT";
  const isCompleted = status === "COMPLETED";
  const isTerminated = status === "CANCELLED" || status === "EXPIRED";

  const photo = photoUrl(vehicle?.photos?.[0]);

  const statusStyle = isActive
    ? "bg-emerald-50 text-emerald-800"
    : isPendingPayment
    ? "bg-amber-50 text-amber-700"
    : isCompleted
    ? "bg-[#E2E8F0] text-[#475569]"
    : isTerminated
    ? "bg-slate-100 text-slate-500"
    : "bg-[#EFF6FF] text-[#1D4ED8]";

  const statusLabel = isUpcoming
    ? t("myBookings.status.upcoming")
    : t(`myBookings.status.${status}`);

  const paymentLabel = !invoiceAvailable
    ? t("myBookings.unpaidTag")
    : booking.paymentStatus === "REFUNDED"
    ? t("myBookings.refundedTag")
    : t("myBookings.paidTag");

  const openDetails = () => {
    navigate(`/my-bookings/${booking._id}`);
  };

  const downloadInvoice = async () => {
    if (!invoiceAvailable) {
      onToast(t("myBookings.invoiceUnavailable"));
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const blob = await bookingApi.downloadInvoice(booking._id);
      saveBlobAsFile(blob, `invoice-${booking._id}.pdf`);
    } catch {
      onToast(t("myBookings.downloadError"));
    } finally {
      setBusy(false);
    }
  };

  const requestCancel = async () => {
    const confirmed = window.confirm(
      `${t("myBookings.cancelConfirmTitle")}\n${t("myBookings.cancelConfirmBody")}`,
    );
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      await bookingApi.cancel(booking._id);
      onCancelled();
      onToast(t("myBookings.cancelSuccess"));
    } catch {
      onToast(t("myBookings.cancelError"));
    } finally {
      setBusy(false);
    }
  };

  const rebook = () => navigate(`/vehicles/${vehicleId}`);
  const resumePayment = () => navigate(`/payment/${booking._id}`);

  const Icon = isActive ? CircleAlert : isUpcoming ? CalendarClock : CircleCheck;

  return (
    <article
      className={`bg-white rounded-2xl border overflow-hidden transition-all ${
        isActive
          ? "border-[#A7F3D0] shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_44px_-8px_rgba(5,150,105,0.18)]"
          : isPendingPayment
          ? "border-[#FCD34D] shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)]"
          : "border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)]"
      } ${isTerminated ? "opacity-80" : ""}`}
    >
      {/* Top status strip */}
      <div className="bg-[#F1F5F9] px-5 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            dir="ltr"
            className="px-2.5 py-1 rounded-md bg-[#2563EB] text-white text-xs font-bold tracking-wider"
          >
            {ref}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusStyle}`}
          >
            {isActive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            <span>{statusLabel}</span>
          </span>
          <span className="hidden sm:inline-flex text-xs text-[#64748B]">
            {t("myBookings.bookedOn")}: {formatDate(booking.createdAt, lang)}
          </span>
        </div>

        {isActive && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
            <ShieldCheck className="w-4 h-4" />
            {t("myBookings.securityNote")}
          </span>
        )}
        {isUpcoming && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CalendarClock className="w-3.5 h-3.5" />
            {t("myBookings.startsIn", { days: Math.max(1, daysUntil(booking.startDate)) })}
          </span>
        )}
        {isPendingPayment && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <CircleAlert className="w-3.5 h-3.5" />
            {t("myBookings.freeCancel", {
              date: formatDate(booking.startDate, lang),
            })}
          </span>
        )}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316]">
            <Star className="w-3.5 h-3.5" />
            {t("myBookings.rated")}
          </span>
        )}
      </div>

      {/* Main card body */}
      <div
        className={`p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center ${
          isActive ? "pt-5" : ""
        }`}
      >
        {/* Vehicle image */}
        <div
          className={`${isActive ? "lg:col-span-4" : "lg:col-span-3"} flex flex-col gap-2`}
        >
          <div className="relative w-full h-40 lg:h-44 rounded-xl overflow-hidden bg-[#F1F5F9]">
            <img
              src={photo}
              alt={title}
              className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
                isCompleted || isTerminated ? "grayscale-[30%] hover:grayscale-0" : ""
              }`}
            />
            {(isActive || isUpcoming) && (
              <span className="absolute bottom-2 end-2 bg-slate-900/85 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5">
                <Star className="w-3 h-3 text-[#F97316]" />
                {t("myBookings.vipBadge")}
              </span>
            )}
          </div>
          {provider && (
            <div className="flex items-center justify-between px-1 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1 min-w-0">
                <Store className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span className="truncate">
                  {t("myBookings.provider", { name: provider.name })}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[#F97316] font-bold shrink-0">
                <Star className="w-3 h-3" />
                4.98
              </span>
            </div>
          )}
        </div>

        {/* Journey, specs and itinerary */}
        <div
          className={`${isActive ? "lg:col-span-5" : "lg:col-span-6"} flex flex-col gap-3`}
        >
          <div>
            <h2 className="text-[17px] font-extrabold text-[#0F172A] leading-snug">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {vehicle?.transmission && (
                <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] font-medium inline-flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-[#94A3B8]" />
                  {t(
                    `myBookings.chips.${
                      TRANSMISSION_KEYS[String(vehicle.transmission).toUpperCase()] ?? "automatic"
                    }`,
                  )}
                </span>
              )}
              {vehicle?.fuelType && (
                <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] font-medium inline-flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-[#94A3B8]" />
                  {t(
                    `myBookings.chips.${
                      FUEL_KEYS[String(vehicle.fuelType).toUpperCase()] ?? "gasoline"
                    }`,
                  )}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] font-medium">
                {t("myBookings.days", { days })}
              </span>
            </div>
          </div>

          {isActive ? (
            /* Timeline for the featured/active booking */
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl flex flex-col gap-3">
              {[
                {
                  label: t("myBookings.pickupStation"),
                  location: booking.pickupLocation,
                  date: formatDate(booking.startDate, lang, true),
                  dot: "bg-[#2563EB]",
                },
                {
                  label: t("myBookings.dropoffStation"),
                  location: booking.pickupLocation,
                  date: formatDate(booking.endDate, lang, true),
                  dot: "bg-[#F97316]",
                  connector: true,
                },
              ].map((stop, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${stop.dot}`} />
                    {stop.connector && <div className="w-0.5 h-6 bg-[#CBD5E1]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#64748B]">{stop.label}</span>
                    <span className="text-[13px] font-bold text-[#0F172A]">
                      {stop.location}
                    </span>
                    <span className="text-[12px] text-[#64748B] font-medium">
                      {stop.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Trip summary grid for the other variants */
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-[#64748B]">
                    {t("myBookings.pickupStation")}
                  </span>
                  <span className="text-xs font-semibold text-[#0F172A] truncate">
                    {booking.pickupLocation}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {formatDate(booking.startDate, lang)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Map className="w-4 h-4 text-[#F97316] shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-[#64748B]">
                    {t("myBookings.dropoffStation")}
                  </span>
                  <span className="text-xs font-semibold text-[#0F172A] truncate">
                    {booking.pickupLocation}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {t("myBookings.hours", { days, totalHours })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price, payment status and actions */}
        <div className="lg:col-span-3 flex flex-col justify-between h-full bg-[#F8FAFC] p-4 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#64748B] font-medium">
              {t(
                isCompleted
                  ? "myBookings.settledCost"
                  : isActive
                  ? "myBookings.totalValue"
                  : "myBookings.estimatedValue",
              )}
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[24px] font-extrabold tracking-tight text-[#2563EB] tabular-nums">
                {formatLYD(booking.totalAmount)}
              </span>
              <span className="text-[13px] font-bold text-[#0F172A]">{currency}</span>
            </div>
            {!isTerminated && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md self-start ${
                  invoiceAvailable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {invoiceAvailable ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <CircleAlert className="w-3.5 h-3.5" />
                )}
                {paymentLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            {!isActive && (
              <button
                type="button"
                onClick={openDetails}
                className="w-full py-2 px-4 bg-[#EFF4FF] hover:bg-[#DBEAFE] text-[#2563EB] text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {t("myBookings.actions.viewDetails")}
              </button>
            )}
            {isActive && (
              <>
                <button
                  type="button"
                  onClick={openDetails}
                  className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {t("myBookings.actions.viewDetails")}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadInvoice}
                    disabled={busy}
                    className="py-2 px-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {t("myBookings.actions.downloadPdf")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToast(t("myBookings.gpsInfo"))}
                    className="py-2 px-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5" />
                    {t("myBookings.actions.trackGps")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onToast(t("myBookings.modifyInfo"))}
                  className="py-1 text-center text-[11px] font-medium text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                >
                  {t("myBookings.actions.modifyRequest")}
                </button>
              </>
            )}

            {(isUpcoming || isPendingPayment) && (
              <>
                <button
                  type="button"
                  onClick={() => onToast(t("myBookings.modifyInfo"))}
                  className="w-full py-2 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <PencilLine className="w-4 h-4" />
                  {t("myBookings.actions.editRoute")}
                </button>
                <button
                  type="button"
                  onClick={requestCancel}
                  disabled={busy}
                  className="w-full py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {t("myBookings.actions.cancelFree")}
                </button>
              </>
            )}

            {isPendingPayment && (
              <button
                type="button"
                onClick={resumePayment}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {t("myBookings.actions.resumePayment")}
              </button>
            )}

            {isCompleted && (
              <>
                <button
                  type="button"
                  onClick={rebook}
                  className="w-full py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("myBookings.actions.rebook")}
                </button>
                <button
                  type="button"
                  onClick={downloadInvoice}
                  disabled={busy}
                  className="w-full py-1.5 px-3 bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-semibold rounded-lg border border-[#E2E8F0] flex items-center justify-center gap-1 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("myBookings.actions.viewInvoice")}
                </button>
              </>
            )}

            {isTerminated && (
              <>
                <button
                  type="button"
                  onClick={rebook}
                  className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("myBookings.actions.rebook")}
                </button>
                <span className="inline-flex items-center justify-center gap-1 text-[11px] text-[#94A3B8]">
                  <CircleX className="w-3.5 h-3.5" />
                  {status === "CANCELLED"
                    ? t("myBookings.status.CANCELLED")
                    : t("myBookings.status.EXPIRED")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default BookingCard;