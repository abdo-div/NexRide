import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarX2 } from "lucide-react";
import { bookingApi } from "../lib/bookingApi";
import type { BookingDto } from "../types/booking";
import { referenceCodeFrom, saveBlobAsFile } from "../lib/bookingView";
import { BookingDetailsHeader } from "../components/bookingDetails/BookingDetailsHeader";
import { TripTimeline } from "../components/bookingDetails/TripTimeline";
import { VehicleCard } from "../components/bookingDetails/VehicleCard";
import { RouteMapSection } from "../components/bookingDetails/RouteMapSection";
import { DriverSection } from "../components/bookingDetails/DriverSection";
import { GatePassCard } from "../components/bookingDetails/GatePassCard";
import { FinancialCard } from "../components/bookingDetails/FinancialCard";
import { ChecklistCard } from "../components/bookingDetails/ChecklistCard";
import { ConciergeCard } from "../components/bookingDetails/ConciergeCard";

const TOAST_MS = 3000;

export const BookingDetailsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useTranslation();

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const loadBooking = useCallback(
    (signal?: AbortSignal) => {
      if (!bookingId) return;
      setLoading(true);
      setLoadFailed(false);
      bookingApi
        .get(bookingId, signal)
        .then((res) => {
          if (!signal?.aborted) setBooking(res.data.booking);
        })
        .catch(() => {
          if (!signal?.aborted) setLoadFailed(true);
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [bookingId],
  );

  useEffect(() => {
    if (!bookingId) return;
    const controller = new AbortController();
    const signal = controller.signal;
    bookingApi
      .get(bookingId, signal)
      .then((res) => {
        if (!signal.aborted) setBooking(res.data.booking);
      })
      .catch(() => {
        if (!signal.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [bookingId]);

  const handleCopy = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(referenceCodeFrom(booking._id));
    } catch {
      /* clipboard unavailable */
    }
    showToast(t("bookingDetails.copiedToast"));
  };

  const handleDownloadDoc = async () => {
    if (!booking || downloadBusy) return;
    if (booking.paymentStatus === "PAID") {
      setDownloadBusy(true);
      try {
        const blob = await bookingApi.downloadInvoice(booking._id);
        saveBlobAsFile(blob, `invoice-${booking._id}.pdf`);
        showToast(t("bookingDetails.gtag"));
      } catch {
        showToast(t("myBookings.downloadError"));
      } finally {
        setDownloadBusy(false);
      }
      return;
    }
    window.print();
    showToast(t("bookingDetails.printToast"));
  };

  const handlePrintGate = () => {
    window.print();
    showToast(t("bookingDetails.printToast"));
  };

  const handleModify = () => {
    showToast(t("bookingDetails.modifyInfo"));
  };

  const handleCancel = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      `${t("bookingDetails.cancelConfirmTitle")}\n${t("bookingDetails.cancelConfirmBody")}`,
    );
    if (!confirmed) return;
    try {
      await bookingApi.cancel(booking._id);
      setToast(t("bookingDetails.cancelSuccess"));
      loadBooking();
    } catch {
      showToast(t("bookingDetails.cancelError"));
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 md:pt-28 pb-8 md:pb-12 flex flex-col gap-6">
        {loading ? (
          <section className="flex flex-col gap-4">
            <div className="h-28 bg-[#E2E8F0] rounded-2xl animate-pulse" />
            <div className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            </div>
          </section>
        ) : loadFailed || !booking ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <CalendarX2 className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="mt-4 text-sm text-[#64748B]">{t("myBookings.loadError")}</p>
            <button
              type="button"
              onClick={() => loadBooking()}
              className="mt-4 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t("myBookings.retry")}
            </button>
          </section>
        ) : (
          <>
            <BookingDetailsHeader
              booking={booking}
              downloadBusy={downloadBusy}
              onDownloadDoc={handleDownloadDoc}
              onPrintGate={handlePrintGate}
              onModify={handleModify}
              onCancel={handleCancel}
              onCopy={handleCopy}
            />

            <TripTimeline
              booking={booking}
              cancelled={
                booking.bookingStatus === "CANCELLED" ||
                booking.bookingStatus === "EXPIRED"
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Main column */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <VehicleCard booking={booking} />
                <RouteMapSection booking={booking} />
                <DriverSection booking={booking} />
              </div>

              {/* Side column */}
              <div className="flex flex-col gap-6">
                <GatePassCard booking={booking} />
                <FinancialCard booking={booking} />
                <ChecklistCard />
                <ConciergeCard />
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default BookingDetailsPage;