import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { getCheckoutMeta, computeCheckoutTotals } from "../data/checkoutData";
import { useVehicleDetail } from "../hooks/useVehicleDetail";
import { mapVehicle } from "../lib/vehicleMapper";
import { reservationSchedule, formatReservationDate } from "../lib/reservationSchedule";
import { createCheckoutAttempt, normalizeDriver, validDriver } from "../lib/checkoutAttempt";
import type { PrimaryDriver } from "../types/booking";
import { bookingApi } from "../lib/bookingApi";
import { ApiError } from "../lib/apiClient";
import { CheckoutIcon } from "../components/checkout/CheckoutIcon";
import { CheckoutHeader } from "../components/checkout/CheckoutHeader";
import { ItinerarySection } from "../components/checkout/ItinerarySection";
import { DriverSection } from "../components/checkout/DriverSection";
import { OptionsSection } from "../components/checkout/OptionsSection";
import { PaymentSection } from "../components/checkout/PaymentSection";
import { BookingSummary } from "../components/checkout/BookingSummary";
import type { CheckoutMeta } from "../types/checkout";
import { moamalatApi } from "../lib/moamalatApi";
import {
  loadMoamalatLightbox,
  openMoamalatLightbox,
  getMoamalatErrorMessage,
} from "../lib/moamalatLightbox";


const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Checkout always resolves the vehicle from the live API. An unknown id shows
 * the clean "details could not be loaded" state instead of any static demo.
 */
export const CheckoutPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();

  const [searchParams] = useSearchParams();
  return <RealCheckout key={(vehicleId ?? "") + "?" + searchParams.toString()} vehicleId={vehicleId ?? ""} />;
};

const RealCheckout: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, vehicle: dto } = useVehicleDetail(vehicleId, false);

  const defaultStart = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const defaultEnd = useMemo(() => toISODate(addDays(new Date(), 4)), []);

  const startDate = searchParams.get("startDate") ?? defaultStart;
  const endDate = searchParams.get("endDate") ?? defaultEnd;
  const startTime = searchParams.get("startTime") ?? "10:00";
  const endTime = searchParams.get("endTime") ?? "10:00";
  const locationParam = searchParams.get("location");

  const schedule = useMemo(() => {
    try { return reservationSchedule(startDate, endDate, startTime, endTime); } catch { return null; }
  }, [startDate, endDate, startTime, endTime]);
  const days = schedule?.days ?? 1;
  const createOnce = useMemo(() => createCheckoutAttempt(bookingApi.create), []);
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const submitting = useRef(false);
  const [driver, setDriver] = useState<PrimaryDriver>({ firstName: "", lastName: "", email: "", phone: "", eligibilityConfirmed: false });

  const vehicle = useMemo(
    () => (dto ? mapVehicle(dto, (key, fallback) => t(key, fallback)) : null),
    [dto, t],
  );

  const fmtDate = useCallback(
    (iso: string) => formatReservationDate(iso, i18n.language),
    [i18n.language],
  );

  const pickupLocation =
    locationParam || vehicle?.perks[0] || t("checkout.pickupFallback");

  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    available: boolean;
    error: string | null;
  } | null>(null);

  const availabilityKey = `${vehicleId}|${schedule?.start}|${schedule?.end}`;

  useEffect(() => {
    if (status !== "ready" || !vehicleId || !schedule || pendingBookingId) return;
    let active = true;
    bookingApi
      .checkAvailability(vehicleId, schedule.start, schedule.end)
      .then((result) => {
        if (active) {
          setAvailabilityResult({
            key: availabilityKey,
            available: result.data.isAvailable,
            error: null,
          });
        }
      })
      .catch((err: unknown) => {
        // A pre-check failure must not block checkout; the POST /bookings
        // transaction is the authoritative availability gate.
        if (active) {
          setAvailabilityResult({
            key: availabilityKey,
            available: true,
            error: err instanceof Error ? err.message : "",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [status, vehicleId, schedule, pendingBookingId, availabilityKey]);

  const currentAvailability =
    availabilityResult?.key === availabilityKey ? availabilityResult : null;
  const availability: "checking" | "available" | "unavailable" = !currentAvailability
    ? "checking"
    : currentAvailability.available
      ? "available"
      : "unavailable";
  const availabilityError = currentAvailability?.error ?? null;

  const baseMeta = useMemo(() => getCheckoutMeta(), []);

  const meta = useMemo<CheckoutMeta>(() => {
    if (!vehicle) return baseMeta;
    return {
      ...baseMeta,
      crumbs: [
        { label: "checkout.header.crumbs.fleet", to: "/fleet" },
        { label: vehicle.title },
        { label: "checkout.header.crumbs.checkout" },
      ],
      itinerary: {
        ...baseMeta.itinerary,
        pickup: {
          ...baseMeta.itinerary.pickup,
          location: pickupLocation,
          date: fmtDate(startDate),
          time: startTime,
        },
        dropoff: {
          ...baseMeta.itinerary.dropoff,
          location: pickupLocation,
          date: fmtDate(endDate),
          time: endTime,
        },
        days,
      },
      driverFields: baseMeta.driverFields.map((field) => ({ ...field, value: "" })),
      payment: {
        ...baseMeta.payment,
        cardFields: baseMeta.payment.cardFields.map((field) => ({ ...field, value: "" })),
      },
    };
  }, [baseMeta, vehicle, days, fmtDate, startDate, endDate, startTime, endTime, pickupLocation]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(baseMeta.addons.filter((a) => a.defaultOn).map((a) => a.id)),
  );
  const [tab, setTab] = useState<"card" | "cash">("card");
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totals = useMemo(
    () => (vehicle ? computeCheckoutTotals(vehicle, meta, selected) : null),
    [vehicle, meta, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const onConfirm = async () => {
    if (!vehicle || !totals || phase !== "idle" || submitting.current) return;
    if (!schedule || Date.parse(schedule.start) <= Date.now()) {
      setSubmitError(t("checkout.invalidSchedule"));
      return;
    }
    if (!validDriver(driver)) {
      setSubmitError(t("checkout.invalidDriver"));
      return;
    }
    submitting.current = true;
    setSubmitError(null);
    setPhase("processing");

    if (tab === "cash") {
      try {
        setSubmissionStarted(true);
        const result = await createOnce({
          vehicleId,
          startDate: schedule.start,
          endDate: schedule.end,
          primaryDriver: normalizeDriver(driver),
          pickupLocation: locationParam || undefined,
          paymentMethod: "CASH_ON_DELIVERY",
          addonIds: Array.from(selected) as Array<"insurance" | "driver" | "childseat" | "delivery">,
        });
        setPhase("done");
        const confirmationQuery = new URLSearchParams({
          booking: result.data.booking._id,
          paymentMethod:
            result.data.payment?.paymentMethod ?? "CASH_ON_DELIVERY",
        });
        navigate(
          `/booking-confirmed/${vehicle.id}?${confirmationQuery.toString()}`,
          { replace: true },
        );
      } catch (err) {
        setPhase("idle");
        submitting.current = false;
        setSubmitError(
          err instanceof ApiError && err.status === 409
            ? t("checkout.submitError.conflict")
            : err instanceof Error
              ? err.message
              : t("checkout.submitError.generic"),
        );
      }
      return;
    }

    try {
      await loadMoamalatLightbox();
      setSubmissionStarted(true);
      const result = await createOnce({
        vehicleId,
        startDate: schedule.start,
        endDate: schedule.end,
        primaryDriver: normalizeDriver(driver),
        pickupLocation: locationParam || undefined,
        addonIds: Array.from(selected) as Array<"insurance" | "driver" | "childseat" | "delivery">,
      });

      const booking = result.data.booking;
      setPendingBookingId(booking._id);
      const init = await moamalatApi.initiate(booking._id);
      const params = init.data.gateway.params;

      openMoamalatLightbox(params, {
        onComplete: async (response) => {
          setPhase("processing");
          try {
            const verifyRes = await moamalatApi.verify({
              merchantReference: params.MerchantReference,
              systemReference: response?.SystemReference || response?.systemReference,
            });

            if (verifyRes.verified || verifyRes.data?.verified) {
              setPhase("done");
              navigate(
                `/booking-confirmed/${vehicle.id}?booking=${booking._id}&paid=true&ref=${params.MerchantReference}`,
                { replace: true },
              );
            } else {
              setPhase("idle");
              submitting.current = false;
              setSubmitError(
                verifyRes.data?.reason ||
                  t("payment.gatewayNotApproved", {
                    defaultValue: "Moamalat did not approve the transaction.",
                  }),
              );
            }
          } catch (err) {
            setPhase("idle");
            submitting.current = false;
            setSubmitError(
              err instanceof Error ? err.message : "Verification request failed.",
            );
          }
        },
        onError: (gatewayError) => {
          setPhase("idle");
          submitting.current = false;
          setSubmitError(
            getMoamalatErrorMessage(gatewayError) ||
              t("payment.gatewayError", {
                defaultValue:
                  "Moamalat payment gateway error. Please try again.",
              }),
          );
        },
        onCancel: () => {
          setPhase("idle");
          submitting.current = false;
          setSubmitError(
            t("payment.cancelledDesc", {
              defaultValue: "Payment was cancelled in Moamalat LightBox.",
            }),
          );
        },
      });
    } catch (err) {
      setPhase("idle");
      submitting.current = false;
      setSubmitError(
        err instanceof ApiError && err.status === 409
          ? t("checkout.submitError.conflict")
          : err instanceof Error
            ? err.message
            : t("checkout.submitError.generic"),
      );
    }
  };

  const unavailable = !pendingBookingId && availability === "unavailable";

  if (status === "loading") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <span className="w-8 h-8 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B]">{t("checkout.loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "error" || status === "notfound" || !vehicle || !totals) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 max-w-[1360px] mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <CheckoutIcon name="car" className="w-10 h-10 text-[#142B4A]" />
            <p className="text-[#0F172A] font-bold text-[18px]">
              {t("checkout.unavailable.fallbackTitle")}
            </p>
            <Link
              to="/fleet"
              className="flex items-center gap-2 text-[#142B4A] font-bold text-sm"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t("checkout.unavailable.browse")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="pt-20">
        <CheckoutHeader vehicleId={vehicle.id} meta={meta} />
      </div>
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            {availability === "checking" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[#142B4A] text-[13px] font-semibold">
                <span className="w-4 h-4 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
                {t("checkout.availability.checking")}
              </div>
            )}
            {availability === "available" && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold">
                {t("checkout.availability.available")}
              </div>
            )}
            {availabilityError && (
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px]">
                {availabilityError}
              </div>
            )}
            <ItinerarySection meta={meta} disabled={!!pendingBookingId} onChangeDates={() => navigate("/vehicles/" + vehicleId + "?" + searchParams.toString())} />
            <fieldset disabled={submissionStarted || phase !== "idle"} className="contents">
            <DriverSection meta={meta} driver={driver} onChange={setDriver} />
            <OptionsSection meta={meta} selected={selected} onToggle={toggle} />
            <PaymentSection
              meta={meta}
              tab={tab}
              onTab={setTab}
              vehicleTitle={vehicle.title}
            />
            </fieldset>
            {pendingBookingId && <Link className="text-[#142B4A] underline" to={"/payment/" + pendingBookingId}>{t("checkout.resumeExisting")}</Link>}
          </div>
          {unavailable ? (
            <div className="lg:col-span-5 self-start lg:sticky lg:top-24 w-full">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#E2E8F0] flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <CheckoutIcon name="calendar" className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">
                  {t("checkout.unavailable.title")}
                </h2>
                <p className="text-[13px] text-[#64748B] leading-relaxed">
                  {t("checkout.unavailable.desc")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  className="w-full py-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[15px] font-bold transition-all"
                >
                  {t("checkout.unavailable.actionLabel")}
                </button>
                <Link
                  to="/fleet"
                  className="text-center text-[#142B4A] font-bold text-[13px]"
                >
                  {t("checkout.unavailable.browse")}
                </Link>
              </div>
            </div>
          ) : (
            <BookingSummary
              vehicle={vehicle}
              meta={meta}
              totals={totals}
              phase={phase}
              onConfirm={onConfirm}
              tab={tab}
              error={submitError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

