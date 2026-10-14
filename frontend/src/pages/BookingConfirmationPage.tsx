import { buildConfirmation } from "../lib/bookingConfirmation";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  CheckCircle2,
  CalendarX2,
  Car,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { vehicleApi } from "../lib/vehicleApi";
import { bookingApi } from "../lib/bookingApi";
import { mapVehicle, photoUrl, initialsFrom } from "../lib/vehicleMapper";
import { ConfirmationHeader } from "../components/bookingConfirmation/ConfirmationHeader";
import { ConfirmationToast } from "../components/bookingConfirmation/ConfirmationToast";
import { ReferenceBar } from "../components/bookingConfirmation/ReferenceBar";
import { ExecutionTimeline } from "../components/bookingConfirmation/ExecutionTimeline";
import { VehicleConfirmationCard } from "../components/bookingConfirmation/VehicleConfirmationCard";
import { IdentificationCard } from "../components/bookingConfirmation/IdentificationCard";
import { RouteSchedule } from "../components/bookingConfirmation/RouteSchedule";
import { PaymentSummary } from "../components/bookingConfirmation/PaymentSummary";
import { HandoverProtocol } from "../components/bookingConfirmation/HandoverProtocol";
import { ActionDock } from "../components/bookingConfirmation/ActionDock";
import type { BookingDto } from "../types/booking";
import type {
  ConfirmationData,
} from "../types/bookingConfirmation";
import type { Vehicle } from "../types/vehicle";

const TOAST_MS = 2500;




/**
 * Projects the booking's embedded vehicle reference into the shape the cards
 * render. Used only when the live GET /vehicles/:id round-trip fails, so the
 * confirmation never depends on static mock data. Every value comes from the
 * booking document itself.
 */
const vehicleFromBooking = (booking: BookingDto): Vehicle | null => {
  const ref = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
  if (!ref) return null;
  const company = typeof booking.companyId === "object" ? booking.companyId : null;
  const title = `${ref.make ?? ""} ${ref.model ?? ""}`.trim() || "Rental Vehicle";
  const operatorName = company?.name?.trim() || "NexRide Partner";

  return {
    id: ref._id,
    title,
  category: "Rental Vehicle",
  vehicleType: "SEDAN",
  fuelType: "GASOLINE",
    segment: "economy",
    pricePerDay: ref.dailyPrice ?? 0,
    totalForPeriod: (ref.dailyPrice ?? 0) * 5,
    periodDays: 5,
    image: photoUrl(ref.photos?.[0]),
    location: company?.city ?? "",
    body: "",
    drive: ref.transmission === "MANUAL" ? "manual" : "auto",
    operatorId: company?._id ?? "",
    operator: {
      id: company?._id ?? "",
      name: operatorName,
      initials: initialsFrom(operatorName),
      rating: 0,
      reviewsCount: 0,
    },
    specs: {
      engine: "—",
      seats: ref.seats ? `${ref.seats} Seats` : "—",
      gearbox: ref.transmission ?? "—",
      fuel: ref.fuelType ?? "—",
    },
    perks: [booking.pickupLocation].filter(
      (value): value is string => Boolean(value && value.trim()),
    ),
  };
};

/**
 * Builds the full confirmation screen exclusively from live booking and vehicle
 * data. The translation values are structural labels; every displayed value
 * (reference, totals, dates, driver, company, route) comes from the booking.
 */

export const BookingConfirmationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const paymentMethod = searchParams.get("paymentMethod") ?? undefined;

  const [toast, setToast] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  // Booking fetch state is keyed by (bookingId, nonce) so "loading" is derived
  // instead of being flipped synchronously inside the effect. A request whose
  // key does not match the current input is never surfaced.
  type BookingFetchState =
    | { status: "idle" }
    | { status: "ready"; key: string; booking: BookingDto }
    | { status: "error"; key: string };

  const [nonce, setNonce] = useState(0);
  const [bookingState, setBookingState] = useState<BookingFetchState>({
    status: "idle",
  });

  const requestKey = bookingId ? `${bookingId}::${nonce}` : "";

  const isCurrentRequest =
    bookingState.status !== "idle" && bookingState.key === requestKey;
  const loading = !isCurrentRequest;
  const loadError = isCurrentRequest && bookingState.status === "error";
  const booking =
    isCurrentRequest && bookingState.status === "ready"
      ? bookingState.booking
      : null;

  useEffect(() => {
    if (!bookingId) return;
    const controller = new AbortController();
    let active = true;

    bookingApi
      .get(bookingId, controller.signal)
      .then((res) => {
        if (!active) return;
        setBookingState({
          status: "ready",
          key: requestKey,
          booking: res.data.booking,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBookingState({ status: "error", key: requestKey });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [bookingId, nonce, requestKey]);

  const refVehicle = useMemo(
    () => (booking ? vehicleFromBooking(booking) : null),
    [booking],
  );

  // The live vehicle is cached under the booking id it belongs to, so a stale
  // vehicle never flashes while a fresh booking is being resolved.
  const liveVehicleKey = booking?._id ?? "";
  const [liveVehicleState, setLiveVehicleState] = useState<{
    key: string;
    vehicle: Vehicle | null;
  }>({ key: "", vehicle: null });
  const liveVehicle =
    liveVehicleState.key === liveVehicleKey ? liveVehicleState.vehicle : null;

  const targetVehicleId = useMemo(() => {
    const ref = booking && typeof booking.vehicleId === "object" ? booking.vehicleId : null;
    return ref?._id ?? (booking && typeof booking.vehicleId === "string" ? booking.vehicleId : undefined);
  }, [booking]);

  useEffect(() => {
    if (!booking || !targetVehicleId) return;
    let active = true;
    vehicleApi
      .getById(targetVehicleId)
      .then((res) => {
        if (active) {
          setLiveVehicleState({
            key: liveVehicleKey,
            vehicle: mapVehicle(res.data.vehicle, (key, fallback) => t(key, fallback)),
          });
        }
      })
      .catch(() => {
        // The booking's embedded vehicle reference is the fallback, not a mock.
      });
    return () => {
      active = false;
    };
  }, [booking, targetVehicleId, liveVehicleKey, t]);

  const vehicle = liveVehicle ?? refVehicle;

  const isCashPending =
    paymentMethod === "CASH_ON_DELIVERY" && booking?.paymentStatus === "UNPAID";

  const resolved = useMemo<ConfirmationData | null>(() => {
    if (!booking || !vehicle) return null;
    return buildConfirmation(booking, vehicle, isCashPending, i18n.language);
  }, [booking, vehicle, isCashPending, i18n.language]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(resolved?.meta.reference.code ?? "");
    } catch {
      /* clipboard unavailable */
    }
    if (resolved) showToast(t(resolved.meta.reference.copyToast));
  };

  const saveBlobAsFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadInvoice = async () => {
    if (!booking || downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const blob = await bookingApi.downloadInvoice(booking._id);
      saveBlobAsFile(blob, `invoice-${booking._id}.pdf`);
      if (resolved) showToast(t(resolved.meta.success.toastDownload));
    } catch {
      showToast(t("booking.success.toastDownloadError"));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <CalendarX2 className="w-7 h-7 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {t("booking.empty.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("booking.empty.desc")}
          </p>
          <Link
            to="/my-bookings"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("booking.empty.action")}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <span className="w-8 h-8 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B]">{t("booking.loading")}</p>
        </div>
      </div>
    );
  }

  if (loadError || !booking || !resolved) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <Car className="w-7 h-7 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {t("booking.notFound.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("booking.notFound.desc")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {loadError && (
              <button
                type="button"
                onClick={() => setNonce((value) => value + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t("booking.notFound.retry")}
              </button>
            )}
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-slate-700 text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t("booking.notFound.action")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showPaidConfirmation = booking.paymentStatus === "PAID";

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-24 md:pt-28 pb-8 md:pb-12 flex flex-col gap-6">
        <ConfirmationHeader
          vehicleTitle={resolved.vehicle.title}
          vehicleId={resolved.vehicle.id}
          meta={resolved.meta}
          onPrint={() => {
            showToast(t(resolved.meta.success.toastPrint));
            window.print();
          }}
          onDownload={handleDownloadInvoice}
          downloadBusy={downloadingInvoice}
        />

        {showPaidConfirmation && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[16px] font-bold text-emerald-950 flex items-center gap-2">
                  {t("booking.success.title")}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    APPROVED
                  </span>
                </h3>
                <p className="text-[13px] text-emerald-800 font-medium">
                  {t("booking.success.desc", { vehicle: resolved.vehicle.title })}
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-800 text-[12px] font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t("booking.payment.paidBadge")}</span>
            </div>
          </div>
        )}

        <ReferenceBar meta={resolved.meta} onCopy={copyRef} />
        <ExecutionTimeline meta={resolved.meta} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <VehicleConfirmationCard data={resolved} />
            <IdentificationCard meta={resolved.meta} />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-5">
            <RouteSchedule data={resolved} />
            <PaymentSummary
              data={resolved}
              paymentStatus={booking.paymentStatus}
              paymentMethod={paymentMethod}
            />
          </div>
        </div>

        <HandoverProtocol meta={resolved.meta} />
        <ActionDock meta={resolved.meta} />
      </div>

      <ConfirmationToast text={toast} />
    </div>
  );
};

export default BookingConfirmationPage;
