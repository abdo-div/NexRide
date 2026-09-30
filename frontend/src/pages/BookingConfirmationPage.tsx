import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { getBookingConfirmation } from "../data/bookingConfirmationData";
import { vehicleApi } from "../lib/vehicleApi";
import { bookingApi } from "../lib/bookingApi";
import { mapVehicle } from "../lib/vehicleMapper";
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
import type { ConfirmationData, ConfirmationMeta, FareLine } from "../types/bookingConfirmation";
import type { Vehicle } from "../types/vehicle";

const TOAST_MS = 2500;

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lyd2 = (n: number) => `${fmt2(n)} LYD`;

const referenceCodeFrom = (id: string) => `NX-${id.slice(-6).toUpperCase()}`;

export const BookingConfirmationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const data = useMemo<ConfirmationData>(() => getBookingConfirmation(vehicleId), [vehicleId]);
  const [toast, setToast] = useState<string | null>(null);

  // When navigated with ?booking=<id>, overlay the real booking onto the
  // static confirmation shell (reference, vehicle, dates, totals).
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [realVehicle, setRealVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    bookingApi
      .get(bookingId)
      .then((res) => {
        if (active) setBooking(res.data.booking);
      })
      .catch(() => {
        /* fall back to the static shell */
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  const targetVehicleId = useMemo(() => {
    if (!booking) return vehicleId;
    const ref = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
    return ref?._id ?? vehicleId;
  }, [booking, vehicleId]);

  useEffect(() => {
    if (!booking || !targetVehicleId) return;
    let active = true;
    vehicleApi
      .getById(targetVehicleId)
      .then((res) => {
        if (active) {
          setRealVehicle(mapVehicle(res.data.vehicle, (key, fallback) => t(key, fallback)));
        }
      })
      .catch(() => {
        /* fall back to the static vehicle card */
      });
    return () => {
      active = false;
    };
  }, [booking, targetVehicleId, t]);

  const resolved = useMemo<ConfirmationData>(() => {
    if (!booking) return data;

    const vehicle = realVehicle ?? data.vehicle;
    const customer = typeof booking.customerId === "object" ? booking.customerId : null;
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const pickupLocation =
      booking.pickupLocation || vehicle.perks[0] || data.meta.route.pickup.location;

    const fmtDateTime = (d: Date) => {
      const datePart = new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
      const timePart = new Intl.DateTimeFormat(i18n.language, {
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
      return `${datePart} · ${timePart}`;
    };

    const meta: ConfirmationMeta = {
      ...data.meta,
      reference: {
        ...data.meta.reference,
        code: referenceCodeFrom(booking._id),
      },
      milestones: data.meta.milestones.map((milestone, index) =>
        index === 0
          ? { ...milestone, values: { amount: lyd2(booking.totalAmount) } }
          : milestone,
      ),
      identification: customer?.name
        ? {
            ...data.meta.identification,
            driverName: customer.name,
            email: customer.email || data.meta.identification.email,
          }
        : data.meta.identification,
      route: {
        ...data.meta.route,
        days,
        pickup: {
          ...data.meta.route.pickup,
          location: pickupLocation,
          datetime: fmtDateTime(start),
        },
        dropoff: {
          ...data.meta.route.dropoff,
          location: pickupLocation,
          datetime: fmtDateTime(end),
        },
      },
    };

    const fareLines: FareLine[] = [
      {
        label: "booking.fare.baseRental",
        amount: lyd2(booking.rentalPrice),
        values: { price: booking.dailyRate, days: booking.totalDays },
      },
    ];

    return {
      ...data,
      vehicle,
      meta,
      fareLines,
      total: lyd2(booking.totalAmount),
    };
  }, [data, booking, realVehicle, i18n.language]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(resolved.meta.reference.code);
    } catch {
      /* clipboard unavailable */
    }
    showToast(t(resolved.meta.reference.copyToast));
  };

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
          onDownload={() => {
            showToast(t(resolved.meta.success.toastDownload));
            window.setTimeout(() => setToast(null), TOAST_MS);
          }}
        />

        {(searchParams.get("paid") === "true" || booking?.paymentStatus === "PAID") && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[16px] font-bold text-emerald-950 flex items-center gap-2">
                  Payment Verified by Moamalat
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    APPROVED
                  </span>
                </h3>
                <p className="text-[13px] text-emerald-800 font-medium">
                  Your reservation is fully paid and confirmed. The vehicle has been secured for you.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-800 text-[12px] font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Moamalat Secured</span>
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
            <PaymentSummary data={resolved} />
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