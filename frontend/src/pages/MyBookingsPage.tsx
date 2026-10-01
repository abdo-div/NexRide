import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarX2, CarFront } from "lucide-react";
import { bookingApi } from "../lib/bookingApi";
import type { MyBookingsResponse } from "../lib/bookingApi";
import type { BookingDto } from "../types/booking";
import {
  referenceCodeFrom,
  saveBlobAsFile,
  vehicleTitle,
} from "../lib/bookingView";
import { MyBookingsHeader } from "../components/myBookings/MyBookingsHeader";
import { BookingStats } from "../components/myBookings/BookingStats";
import {
  BookingFilters,
  type BookingsSort,
  type BookingsTab,
} from "../components/myBookings/BookingFilters";
import { BookingCard } from "../components/myBookings/BookingCard";
import { VipSupportBanner } from "../components/myBookings/VipSupportBanner";

const TOAST_MS = 2800;

const inStatusTab = (booking: BookingDto, tab: BookingsTab): boolean => {
  const status = booking.bookingStatus;
  switch (tab) {
    case "all":
      return true;
    case "upcoming":
      return ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"].includes(status);
    case "completed":
      return status === "COMPLETED";
    case "cancelled":
      return status === "CANCELLED" || status === "EXPIRED";
  }
};

const cloneCsvCell = (value: string | number): string =>
  `"${String(value).replaceAll('"', '""')}"`;

export const MyBookingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [tab, setTab] = useState<BookingsTab>("all");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<BookingsSort>("newest");

  const [toast, setToast] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const loadBookings = (signal?: AbortSignal) => {
    setLoading(true);
    setLoadFailed(false);
    bookingApi
      .listMy(signal)
      .then((res: MyBookingsResponse) => setBookings(res.data.bookings ?? []))
      .catch(() => {
        if (!signal?.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    bookingApi
      .listMy(signal)
      .then((res: MyBookingsResponse) => {
        if (!signal.aborted) setBookings(res.data.bookings ?? []);
      })
      .catch(() => {
        if (!signal.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const cities = useMemo<string[]>(() => {
    const seen = new Set<string>();
    bookings.forEach((booking) => {
      const value = booking.pickupLocation?.trim();
      if (value) seen.add(value);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, i18n.language));
  }, [bookings, i18n.language]);

  const counts = useMemo(
    () => ({
      upcoming: bookings.filter((b) => inStatusTab(b, "upcoming")).length,
      completed: bookings.filter((b) => inStatusTab(b, "completed")).length,
      cancelled: bookings.filter((b) => inStatusTab(b, "cancelled")).length,
    }),
    [bookings],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(i18n.language);
    return bookings
      .filter((booking) => inStatusTab(booking, tab))
      .filter((booking) => {
        if (city && booking.pickupLocation !== city) return false;
        if (!needle) return true;
        const haystack = [
          referenceCodeFrom(booking._id),
          vehicleTitle(booking),
          booking.pickupLocation,
        ]
          .join(" ")
          .toLocaleLowerCase(i18n.language);
        return haystack.includes(needle);
      })
      .slice()
      .sort((a, b) => {
        switch (sort) {
          case "price-desc":
            return b.totalAmount - a.totalAmount;
          case "soonest":
            return (
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
          case "newest":
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });
  }, [bookings, tab, search, city, sort, i18n.language]);

  const handleExport = () => {
    if (exportBusy) return;
    if (filtered.length === 0) {
      showToast(t("myBookings.invoiceUnavailable"));
      return;
    }
    setExportBusy(true);
    try {
      const header = [
        "Ref",
        "Vehicle",
        "Start Date",
        "End Date",
        "Pickup Location",
        "Rental Price",
        "Discount",
        "Total (LYD)",
        "Booking Status",
        "Payment Status",
      ];
      const rows = filtered.map((booking) => [
        referenceCodeFrom(booking._id),
        vehicleTitle(booking),
        booking.startDate,
        booking.endDate,
        booking.pickupLocation,
        booking.rentalPrice,
        booking.discountAmount,
        booking.totalAmount,
        booking.bookingStatus,
        booking.paymentStatus,
      ]);
      const csv =
        "\uFEFF" +
        [header, ...rows].map((row) => row.map(cloneCsvCell).join(",")).join("\r\n");
      saveBlobAsFile(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `nexride-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      showToast(t("myBookings.exportToast"));
    } finally {
      setExportBusy(false);
    }
  };

  // VIP loyalty points = 1 point per 10 LYD of settled (paid/refunded) value.
  const points = Math.round(
    bookings
      .filter(
        (booking) =>
          booking.paymentStatus === "PAID" ||
          booking.paymentStatus === "REFUNDED" ||
          booking.bookingStatus === "COMPLETED",
      )
      .reduce((sum, booking) => sum + booking.totalAmount, 0) / 10,
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 md:pt-28 pb-8 md:pb-12 flex flex-col gap-6">
        <MyBookingsHeader onExport={handleExport} exportBusy={exportBusy} />

        {!loading && !loadFailed && (
          <BookingStats bookings={bookings} points={points} />
        )}

        {loading ? (
          /* Loading skeleton */
          <section className="flex flex-col gap-4">
            <div className="h-16 bg-[#E2E8F0] rounded-2xl animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-48 bg-white border border-slate-200 rounded-2xl animate-pulse"
              />
            ))}
          </section>
        ) : loadFailed ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <CalendarX2 className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="mt-4 text-sm text-[#64748B]">
              {t("myBookings.loadError")}
            </p>
            <button
              type="button"
              onClick={() => loadBookings()}
              className="mt-4 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t("myBookings.retry")}
            </button>
          </section>
        ) : (
          <>
            <BookingFilters
              tab={tab}
              onTabChange={setTab}
              search={search}
              onSearchChange={setSearch}
              cities={cities}
              city={city}
              onCityChange={setCity}
              sort={sort}
              onSortChange={setSort}
              counts={counts}
            />

            {filtered.length === 0 ? (
              <section className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <CarFront className="w-7 h-7" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-[#0F172A]">
                  {t("myBookings.emptyTitle")}
                </h3>
                <p className="mt-1 text-sm text-[#64748B] max-w-sm">
                  {t("myBookings.emptyBody")}
                </p>
                <Link
                  to="/FleetPage"
                  className="mt-5 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {t("myBookings.emptyCta")}
                </Link>
              </section>
            ) : (
              <section className="flex flex-col gap-4">
                {filtered.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    onToast={showToast}
                    onCancelled={() => loadBookings()}
                  />
                ))}
              </section>
            )}

            <VipSupportBanner />
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

export default MyBookingsPage;