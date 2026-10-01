import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Copy,
  Download,
  PencilLine,
  ReceiptText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import { formatDate, referenceCodeFrom } from "../../lib/bookingView";

interface BookingDetailsHeaderProps {
  booking: BookingDto;
  downloadBusy: boolean;
  onDownloadDoc: () => void;
  onPrintGate: () => void;
  onModify: () => void;
  onCancel: () => void;
  onCopy: () => void;
}

const isCancellable = (status: BookingDto["bookingStatus"]): boolean =>
  status === "PENDING_PAYMENT" || status === "PAID" || status === "CONFIRMED";

export const BookingDetailsHeader: React.FC<BookingDetailsHeaderProps> = ({
  booking,
  downloadBusy,
  onDownloadDoc,
  onPrintGate,
  onModify,
  onCancel,
  onCopy,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const BackArrow = i18n.dir() === "rtl" ? ArrowRight : ArrowLeft;

  const status = booking.bookingStatus;
  const ref = referenceCodeFrom(booking._id);
  const isPaid = booking.paymentStatus === "PAID";
  const pill =
    status === "ACTIVE" || status === "CONFIRMED" || (status === "PAID" && isPaid)
      ? "bg-emerald-50 text-emerald-800"
      : status === "PENDING_PAYMENT"
      ? "bg-amber-50 text-amber-700"
      : status === "CANCELLED"
      ? "bg-red-50 text-red-700"
      : "bg-[#E2E8F0] text-[#475569]";

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <nav className="flex items-center gap-2 text-[12px] text-[#64748B]">
          <Link to="/" className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            {t("bookingDetails.breadcrumbHome")}
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <Link to="/my-bookings" className="hover:text-[#2563EB] transition-colors">
            {t("bookingDetails.breadcrumbList")}
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#0F172A] font-bold text-[#2563EB]">
            {t("bookingDetails.title")} #{ref}
          </span>
        </nav>
        <Link
          to="/my-bookings"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#2563EB] font-bold hover:gap-2.5 transition-all"
        >
          <BackArrow className="w-4 h-4" />
          {t("bookingDetails.backToList")}
        </Link>
      </div>

      {/* Identity + actions */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] lg:text-[26px] font-extrabold tracking-tight text-[#0F172A]">
              {t("bookingDetails.title")}{" "}
              <span className="text-[#2563EB] font-mono tracking-normal">
                #{ref}
              </span>
            </h1>
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-full text-[11px] text-[#64748B] transition-colors cursor-pointer"
              title={t("bookingDetails.copyCode")}
            >
              <Copy className="w-3.5 h-3.5" />
              {t("bookingDetails.copyCode")}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-1">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${pill}`}
            >
              {(status === "CONFIRMED" ||
                status === "PAID" ||
                status === "ACTIVE") && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              {t(`bookingDetails.statusPill.${status}`)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#64748B]">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              {t("bookingDetails.registeredNote")}
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDownloadDoc}
            disabled={downloadBusy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t("bookingDetails.docPdf")}
          </button>
          <button
            type="button"
            onClick={onPrintGate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <ReceiptText className="w-4 h-4" />
            <span className="hidden sm:inline">{t("bookingDetails.gatePass")}</span>
          </button>
          {status !== "CANCELLED" && status !== "EXPIRED" && status !== "COMPLETED" && (
            <button
              type="button"
              onClick={onModify}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title={t("bookingDetails.modify")}
            >
              <PencilLine className="w-4 h-4" />
              {t("bookingDetails.modify")}
            </button>
          )}
          {status === "PENDING_PAYMENT" && (
            <Link
              to={`/payment/${booking._id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#0F172A] rounded-xl text-xs font-extrabold transition-colors"
            >
              <CalendarClock className="w-4 h-4" />
              {t("bookingDetails.resumePayment")}
            </Link>
          )}
          {status === "PENDING_PAYMENT" && (
            <button
              type="button"
              onClick={onCancel}
              disabled={!isCancellable(status)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              {t("bookingDetails.cancel")}
            </button>
          )}
          {isCancellable(status) && status !== "PENDING_PAYMENT" && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden md:inline">
                {t("bookingDetails.cancelFree", {
                  date: formatDate(booking.startDate, lang),
                })}
              </span>
              <span className="md:hidden">{t("bookingDetails.cancel")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsHeader;