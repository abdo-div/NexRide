import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, UserRound, SlidersHorizontal, CreditCard } from "lucide-react";
import { getCheckoutMeta, computeCheckoutTotals } from "../data/checkoutData";
import { useVehicleDetail } from "../hooks/useVehicleDetail";
import { mapVehicle } from "../lib/vehicleMapper";
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
import { useToast } from "../context/toastContextValue";
import {
  loadMoamalatLightbox,
  openMoamalatLightbox,
  getMoamalatErrorMessage,
} from "../lib/moamalatLightbox";
import { useCustomerPreferences } from "../context/useCustomerPreferences";
import { rewardApi } from "../lib/rewardApi";


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

  return <RealCheckout vehicleId={vehicleId ?? ""} />;
};

const RealCheckout: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { preferences } = useCustomerPreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, vehicle: dto } = useVehicleDetail(vehicleId, false);
  // Keep one key for this mounted checkout. A retry after a timeout therefore
  // retrieves the original reservation instead of attempting a second insert.
  const bookingAttemptKey = useRef(crypto.randomUUID());

  const defaultStart = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const defaultEnd = useMemo(() => toISODate(addDays(new Date(), preferences.defaultRentalDays + 1)), [preferences.defaultRentalDays]);

  const startDate = searchParams.get("startDate") ?? defaultStart;
  const endDate = searchParams.get("endDate") ?? defaultEnd;
  const startTime = searchParams.get("startTime") ?? preferences.pickupTime;
  const endTime = searchParams.get("endTime") ?? preferences.returnTime;
  const locationParam = searchParams.get("location");

  const days = useMemo(() => {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(ms / 86400000));
  }, [startDate, endDate]);

  const vehicle = useMemo(
    () => (dto ? mapVehicle(dto, (key, fallback) => t(key, fallback)) : null),
    [dto, t],
  );

  const fmtDate = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${iso}T00:00:00`)),
    [i18n.language],
  );

  const pickupLocation =
    locationParam || vehicle?.perks[0] || t("checkout.pickupFallback");

  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    available: boolean;
    error: string | null;
  } | null>(null);

  const availabilityKey = `${vehicleId}|${startDate}|${endDate}`;

  useEffect(() => {
    if (status !== "ready" || !vehicleId) return;
    let active = true;
    bookingApi
      .checkAvailability(vehicleId, startDate, endDate)
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
  }, [status, vehicleId, startDate, endDate, availabilityKey]);

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
  const [tab, setTab] = useState<"card" | "cash">(
    preferences.paymentMethod === "CASH_ON_DELIVERY" ? "cash" : "card",
  );
  const paymentChoiceTouched = useRef(false);
  useEffect(() => {
    if (!paymentChoiceTouched.current) {
      void Promise.resolve().then(() => {
        if (!paymentChoiceTouched.current) {
          setTab(preferences.paymentMethod === "CASH_ON_DELIVERY" ? "cash" : "card");
        }
      });
    }
  }, [preferences.paymentMethod]);
  const selectPaymentTab = (next: "card" | "cash") => {
    paymentChoiceTouched.current = true;
    setTab(next);
  };
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [driverValues, setDriverValues] = useState<Record<string, string>>({});
  const [driverConfirmed, setDriverConfirmed] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<{ code: string; discountAmount: number } | null>(null);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  useEffect(() => {
    if (!submitError) return;
    showToast({ tone: "error", title: t("toasts.bookingFailed.title"), description: submitError });
  }, [showToast, submitError, t]);

  const driverComplete = useMemo(() => {
    const allFieldsFilled = meta.driverFields.every(
      (field) => (driverValues[field.id] ?? "").trim().length > 0,
    );
    const email = (driverValues.email ?? "").trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return allFieldsFilled && emailValid && driverConfirmed;
  }, [driverConfirmed, driverValues, meta.driverFields]);

  const updateDriverField = (id: string, value: string) => {
    setDriverValues((current) => ({ ...current, [id]: value }));
  };

  const totals = useMemo(
    () => (vehicle ? computeCheckoutTotals(vehicle, meta, selected) : null),
    [vehicle, meta, selected],
  );
  const displayTotals = useMemo(() => totals ? { ...totals, total: Math.max(0, totals.total - (appliedPromotion?.discountAmount ?? 0)) } : null, [totals, appliedPromotion]);

  const applyPromotion = async () => {
    if (!promotionCode.trim()) return;
    setPromotionBusy(true);
    setPromotionError(null);
    try {
      const response = await rewardApi.quote({ code: promotionCode, vehicleId, startDate, endDate, addonIds: Array.from(selected) });
      setAppliedPromotion({ code: response.data.quote.code, discountAmount: response.data.quote.discountAmount });
      setPromotionCode(response.data.quote.code);
    } catch (error) {
      setAppliedPromotion(null);
      setPromotionError(error instanceof Error ? error.message : t("checkout.promotion.error"));
    } finally { setPromotionBusy(false); }
  };

  const toggle = (id: string) => {
    setAppliedPromotion(null);
    setPromotionError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onConfirm = async () => {
    if (!vehicle || !totals || phase !== "idle" || !driverComplete) return;
    setSubmitError(null);
    setPhase("processing");

    if (tab === "cash") {
      try {
        const result = await bookingApi.create(
          {
            vehicleId,
            startDate,
            endDate,
            pickupLocation: locationParam || undefined,
            paymentMethod: "CASH_ON_DELIVERY",
            addonIds: Array.from(selected) as Array<"insurance" | "driver" | "childseat" | "delivery">,
            promotionCode: appliedPromotion?.code,
          },
          bookingAttemptKey.current,
        );
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

    let pendingBookingId: string | null = null;
    const releasePendingBooking = async (bookingId: string) => {
      try {
        await moamalatApi.release(bookingId);
      } catch (releaseError) {
        // Keep a second authenticated path so a transient release-endpoint
        // failure cannot leave the vehicle blocked by an unpaid booking.
        try {
          await bookingApi.cancel(bookingId, "Moamalat payment was not completed");
        } catch {
          throw releaseError;
        }
      } finally {
        // The prior idempotency key points to the now-expired booking. A retry
        // must create a fresh pending reservation.
        bookingAttemptKey.current = crypto.randomUUID();
      }
    };

    try {
      await loadMoamalatLightbox();
      const result = await bookingApi.create(
        {
          vehicleId,
          startDate,
          endDate,
          pickupLocation: locationParam || undefined,
          addonIds: Array.from(selected) as Array<"insurance" | "driver" | "childseat" | "delivery">,
          promotionCode: appliedPromotion?.code,
        },
        bookingAttemptKey.current,
      );

      const booking = result.data.booking;
      pendingBookingId = booking._id;
      const init = await moamalatApi.initiate(booking._id);
      const params = init.data.gateway.params;

      openMoamalatLightbox(params, {
        demoAction:
          init.data.gateway.env === "test"
            ? {
                label: t("payment.completeDemoPayment", {
                  defaultValue: "Complete demo payment",
                }),
                onClick: async () => {
                  setPhase("processing");
                  try {
                    const simulated = await moamalatApi.simulate(booking._id);
                    if (!simulated.verified || !simulated.simulated) {
                      throw new Error(
                        t("payment.simulationFailed", {
                          defaultValue: "The test payment could not be completed.",
                        }),
                      );
                    }
                    setPhase("done");
                    navigate(
                      `/booking-confirmed/${vehicle.id}?booking=${booking._id}&paid=true&ref=${params.MerchantReference}`,
                      { replace: true },
                    );
                  } catch (error) {
                    setPhase("idle");
                    setSubmitError(
                      error instanceof Error
                        ? error.message
                        : t("payment.simulationFailed", {
                            defaultValue: "The test payment could not be completed.",
                          }),
                    );
                  }
                },
              }
            : undefined,
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
              await releasePendingBooking(booking._id);
              setPhase("idle");
              setSubmitError(
                verifyRes.data?.reason ||
                  t("payment.gatewayNotApproved", {
                    defaultValue: "Moamalat did not approve the transaction.",
                  }),
              );
            }
          } catch (err) {
            await releasePendingBooking(booking._id).catch(() => undefined);
            setPhase("idle");
            setSubmitError(
              err instanceof Error ? err.message : "Verification request failed.",
            );
          }
        },
        onError: (gatewayError) => {
          setPhase("processing");
          void releasePendingBooking(booking._id)
            .catch(() => undefined)
            .finally(() => {
              setPhase("idle");
              setSubmitError(
                getMoamalatErrorMessage(gatewayError) ||
                  t("payment.gatewayError", {
                    defaultValue:
                      "Moamalat payment gateway error. Please try again.",
                  }),
              );
            });
        },
        onCancel: () => {
          setSubmitError(null);
          setPhase("processing");
          void releasePendingBooking(booking._id)
            .catch(() => undefined)
            .finally(() => setPhase("idle"));
        },
      });
    } catch (err) {
      if (pendingBookingId) {
        await releasePendingBooking(pendingBookingId).catch(() => undefined);
      }
      setPhase("idle");
      setSubmitError(
        err instanceof ApiError && err.status === 409
          ? t("checkout.submitError.conflict")
          : err instanceof Error
            ? err.message
            : t("checkout.submitError.generic"),
      );
    }
  };

  const unavailable = availability === "unavailable";
  const steps = [
    { id: 1, label: t("checkout.flow.details"), icon: UserRound },
    { id: 2, label: t("checkout.flow.options"), icon: SlidersHorizontal },
    { id: 3, label: t("checkout.flow.payment"), icon: CreditCard },
  ];
  const moveToStep = (step: number) => {
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (status === "loading" || !vehicle || !totals || !displayTotals) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <span className="w-8 h-8 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B]">{t("checkout.loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "error" || status === "notfound") {
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
        <CheckoutHeader vehicleId={vehicle.id} meta={meta} currentStep={activeStep} totalSteps={steps.length} />
      </div>
      <div className="mx-auto w-full max-w-[1360px] px-4 py-8 lg:px-8">
        <nav aria-label={t("checkout.flow.label")} className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_18px_50px_-36px_rgba(15,23,42,.5)]">
          <ol className="grid grid-cols-3 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const complete = activeStep > step.id;
              const current = activeStep === step.id;
              const reachable = step.id < activeStep || (step.id === 2 && driverComplete) || (step.id === 3 && driverComplete && activeStep >= 2);
              return (
                <li key={step.id}>
                  <button type="button" disabled={!reachable && !current} onClick={() => moveToStep(step.id)} aria-current={current ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-all sm:px-5 ${current ? "bg-[#142B4A] text-white shadow-lg" : complete ? "bg-emerald-50 text-emerald-800" : "text-slate-400"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${current ? "bg-white/15" : complete ? "bg-emerald-100" : "bg-slate-100"}`}>{complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
                    <span className="hidden sm:block"><span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">{t("checkout.flow.step", { number: step.id })}</span><span className="text-sm font-bold">{step.label}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
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
            {activeStep === 1 && <>
              <ItinerarySection meta={meta} onChange={() => navigate(`/cars/${vehicleId}?${searchParams.toString()}`)} />
              <DriverSection meta={meta} values={driverValues} confirmed={driverConfirmed} onFieldChange={updateDriverField} onConfirmedChange={setDriverConfirmed} />
              <div className="flex flex-col items-end gap-2">
                <button type="button" disabled={!driverComplete || availability !== "available"} onClick={() => moveToStep(2)} className="premium-button inline-flex min-w-48 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{t("checkout.flow.continueOptions")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></button>
                {!driverComplete && <p className="text-xs font-semibold text-amber-700">{t("checkout.driver.completionHint")}</p>}
              </div>
            </>}
            {activeStep === 2 && <>
              <OptionsSection meta={meta} selected={selected} onToggle={toggle} />
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => moveToStep(1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t("checkout.flow.back")}</button>
                <button type="button" onClick={() => moveToStep(3)} className="premium-button inline-flex items-center gap-2">{t("checkout.flow.continuePayment")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></button>
              </div>
            </>}
            {activeStep === 3 && <>
              <PaymentSection meta={meta} tab={tab} onTab={selectPaymentTab} vehicleTitle={vehicle.title} />
              <button type="button" onClick={() => moveToStep(2)} className="inline-flex w-fit items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t("checkout.flow.backOptions")}</button>
            </>}
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
              totals={displayTotals}
              phase={phase}
              onConfirm={onConfirm}
              tab={tab}
              error={submitError}
              driverComplete={driverComplete && activeStep === 3}
              promotionCode={promotionCode}
              promotionDiscount={appliedPromotion?.discountAmount ?? 0}
              promotionBusy={promotionBusy}
              promotionError={promotionError}
              onPromotionCodeChange={(value) => { setPromotionCode(value); if (value !== appliedPromotion?.code) setAppliedPromotion(null); }}
              onApplyPromotion={() => void applyPromotion()}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

