import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { bookingApi } from "../lib/bookingApi";
import { ApiError } from "../lib/apiClient";
import type { BookingDto } from "../types/booking";
import { moamalatApi } from "../lib/moamalatApi";
import { useDialog } from "../context/useDialog";
import {
  getMoamalatErrorMessage,
  loadMoamalatLightbox,
  openMoamalatLightbox,
} from "../lib/moamalatLightbox";

type PaymentStatus =
  | "loading"
  | "notfound"
  | "ready"
  | "preparing"
  | "verifying"
  | "failed"
  | "gatewayError";

const vehicleIdOf = (booking: BookingDto): string =>
  typeof booking.vehicleId === "object" ? booking.vehicleId._id : booking.vehicleId;

const vehicleTitleOf = (booking: BookingDto): string => {
  if (typeof booking.vehicleId === "object" && booking.vehicleId.make) {
    return `${booking.vehicleId.make} ${booking.vehicleId.model ?? ""}`.trim();
  }
  return "";
};

const freshCheckoutUrl = (booking: BookingDto): string => {
  const params = new URLSearchParams({
    startDate: booking.startDate.slice(0, 10),
    endDate: booking.endDate.slice(0, 10),
    location: booking.pickupLocation,
  });
  return `/checkout/${vehicleIdOf(booking)}?${params.toString()}`;
};

const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { confirm: confirmDialog } = useDialog();

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [gatewayEnv, setGatewayEnv] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    bookingApi
      .get(bookingId)
      .then((result) => {
        if (!active) return;
        const loadedBooking = result.data.booking;
        if (
          loadedBooking.paymentStatus !== "PAID" &&
          (loadedBooking.bookingStatus !== "PENDING_PAYMENT" ||
            loadedBooking.paymentStatus !== "UNPAID")
        ) {
          navigate(freshCheckoutUrl(loadedBooking), { replace: true });
          return;
        }
        setBooking(loadedBooking);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("notfound");
      });

    return () => {
      active = false;
    };
  }, [bookingId, navigate]);

  useEffect(() => {
    if (!booking || booking.paymentStatus === "PAID") return;
    void moamalatApi
      .getConfig()
      .then((config) => setGatewayEnv(config.data?.env ?? config.env ?? null))
      .catch(() => setGatewayEnv(null));
    void loadMoamalatLightbox().catch(() => undefined);
  }, [booking]);

  const fmtDate = (iso: string) => {
    const parsed = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;

    return new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(parsed);
  };

  const fmtAmount = (value: number) =>
    `${new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value)} ${t("common.lyd", { defaultValue: "LYD" })}`;

  const goToConfirmation = () => {
    if (!booking) return;
    navigate(`/booking-confirmed/${vehicleIdOf(booking)}?booking=${booking._id}&paid=true`, {
      replace: true,
    });
  };

  const releaseFailedPayment = async () => {
    if (!booking) return;
    try {
      await moamalatApi.release(booking._id);
    } finally {
      navigate("/fleet?payment=failed", { replace: true });
    }
  };

  const showRetryableGatewayError = (message?: string | null) => {
    setStatus("gatewayError");
    setError(
      message ||
        t("payment.gatewayNotApproved", {
          defaultValue:
            "Moamalat did not approve the transaction. Your reservation is still available; try again with the sandbox card shown below.",
        }),
    );
  };

  const handleVerified = async (
    merchantReference: string,
    response?: LightboxCompleteResponse,
  ) => {
    setStatus("verifying");
    setError(null);
    try {
      const result = await moamalatApi.verify({
        merchantReference,
        systemReference:
          response?.SystemReference ??
          response?.systemReference ??
          undefined,
      });
      if (result.verified || result.data?.verified) {
        goToConfirmation();
      } else if (result.retryable || result.data?.retryable) {
        showRetryableGatewayError(result.reason ?? result.data?.reason);
      } else {
        await releaseFailedPayment();
      }
    } catch (err) {
      showRetryableGatewayError(err instanceof Error ? err.message : null);
    }
  };

  const completeTestPayment = async () => {
    if (!booking) return;
    setError(null);
    setStatus("verifying");
    try {
      const result = await moamalatApi.simulate(booking._id);
      if (result.verified && result.simulated) {
        goToConfirmation();
        return;
      }
      showRetryableGatewayError(
        t("payment.simulationFailed", {
          defaultValue: "The test payment could not be completed.",
        }),
      );
    } catch (err) {
      showRetryableGatewayError(err instanceof Error ? err.message : null);
    }
  };

  const handlePay = async () => {
    if (!booking) return;
    setError(null);
    setStatus("preparing");
    try {
      await loadMoamalatLightbox();
      const init = await moamalatApi.initiate(booking._id);
      if (import.meta.env.DEV) {
        console.debug("[Moamalat] initiate response:", init);
        console.debug("[Moamalat] LightBox params:", init.data.gateway.params);
      }
      openMoamalatLightbox(init.data.gateway.params, {
        demoAction:
          gatewayEnv === "test"
            ? {
                label: t("payment.completeDemoPayment", {
                  defaultValue: "Complete demo payment",
                }),
                onClick: completeTestPayment,
              }
            : undefined,
        onComplete: (response) => {
          handleVerified(init.data.payment.merchantReference, response);
        },
        onError: (gatewayError) => {
          showRetryableGatewayError(getMoamalatErrorMessage(gatewayError));
        },
        onCancel: () => {
          setStatus("ready");
          setError(null);
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        navigate(freshCheckoutUrl(booking), { replace: true });
        return;
      }
      showRetryableGatewayError(err instanceof Error ? err.message : null);
    }
  };

  const handleSimulatedPayment = async () => {
    if (!booking || gatewayEnv !== "test") return;
    await completeTestPayment();
  };

  const [cancelling, setCancelling] = useState(false);

  const handleCancelReservation = async () => {
    if (!booking || cancelling) return;
    const confirmMessage = t("payment.cancelConfirm", {
      defaultValue:
        "Are you sure you want to cancel this reservation? The vehicle will be immediately released back to the fleet.",
    });
    if (!(await confirmDialog(confirmMessage))) return;

    setCancelling(true);
    try {
      await bookingApi.cancel(booking._id, "Customer cancelled payment");
      navigate("/fleet", { replace: true });
    } catch {
      setError(
        t("payment.cancelFailed", {
          defaultValue: "Unable to cancel reservation. Please try again.",
        }),
      );
      setCancelling(false);
    }
  };

  // -------------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <span className="w-8 h-8 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B]">{t("payment.title")}</p>
        </div>
      </div>
    );
  }

  if (status === "notfound" || !booking) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 max-w-[1360px] mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <XCircle className="w-10 h-10 text-red-500" />
            <p className="text-[#0F172A] font-bold text-[18px]">
              {t("payment.notFoundTitle")}
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

  // Booking already settled elsewhere (e.g. cash or a previous attempt).
  const alreadyPaid = booking.paymentStatus === "PAID";

  const vehicleTitle = vehicleTitleOf(booking) || t("payment.vehicle");
  const bookingVehicleId = vehicleIdOf(booking);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="pt-20">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-6 pb-8">
          <Link
            to={`/vehicles/${bookingVehicleId}`}
            className="inline-flex items-center gap-2 text-[#142B4A] font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("payment.backToVehicle", { defaultValue: "Back to vehicle" })}
          </Link>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-4 lg:px-8 pb-16 w-full">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
          <div className="p-6 lg:p-8 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-[#142B4A]" />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-[#0F172A]">
                  {t("payment.title")}
                </h1>
                <p className="text-[13px] text-[#64748B]">
                  {t("payment.subtitle")}
                </p>
              </div>
            </div>

            {alreadyPaid ? (
              <div className="flex flex-col gap-4 rounded-xl bg-emerald-50 border border-emerald-200 p-6">
                <p className="text-emerald-800 text-[15px] font-bold">
                  {t("payment.alreadyPaidTitle")}
                </p>
                <p className="text-[13px] text-emerald-700 leading-relaxed">
                  {t("payment.alreadyPaidDesc")}
                </p>
                <button
                  type="button"
                  onClick={goToConfirmation}
                  className="self-start py-3 px-6 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-bold transition-all"
                >
                  {t("payment.viewConfirmation")}
                </button>
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.bookingRef")}
                    </dt>
                    <dd className="text-[15px] font-bold text-[#0F172A] mt-1">
                      {`NX-${booking._id.slice(-6)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.vehicle")}
                    </dt>
                    <dd className="text-[15px] font-bold text-[#0F172A] mt-1">
                      {vehicleTitle}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.dates")}
                    </dt>
                    <dd className="flex items-center gap-2 text-[15px] font-bold text-[#0F172A] mt-1">
                      <CalendarDays className="w-4 h-4 text-[#142B4A]" />
                      {`${fmtDate(booking.startDate)} - ${fmtDate(booking.endDate)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.location")}
                    </dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-[#0F172A] mt-1">
                      <MapPin className="w-4 h-4 text-[#142B4A]" />
                      {booking.pickupLocation || t("checkout.pickupFallback")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.amount")}
                    </dt>
                    <dd className="text-[20px] font-bold text-[#0F172A] mt-1">
                      {fmtAmount(booking.totalAmount)}
                    </dd>
                  </div>
                </dl>

                {gatewayEnv === "test" && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-start">
                    <p className="text-[14px] font-bold text-amber-900">
                      {t("payment.sandboxTitle")}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-amber-800">
                      {t("payment.sandboxDesc")}
                    </p>
                    <div
                      dir="ltr"
                      className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-amber-200 bg-white p-3 font-mono text-[12px] text-slate-800 sm:grid-cols-3"
                    >
                      <span className="sm:col-span-3">6395 0431 6572 5698</span>
                      <span>{t("payment.sandboxExpiry")}: 01/27</span>
                      <span>OTP: 111111</span>
                      <span>{t("payment.sandboxName")}: TEST USER</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
                      {t("payment.sandboxAmount")}
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulatedPayment}
                      disabled={status === "verifying" || status === "preparing"}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-900 px-5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {t("payment.simulatePayment")}
                    </button>
                    <p className="mt-2 text-center text-[10px] font-semibold text-amber-800">
                      {t("payment.simulatePaymentNote")}
                    </p>
                  </div>
                )}

                {(status === "failed" || status === "gatewayError") && (
                  <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-[15px] font-bold text-red-700">
                      {t("payment.gatewayTitle")}
                    </p>
                    <p className="text-[13px] leading-relaxed text-red-600">
                      {error || t("payment.gatewayDesc")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handlePay}
                        className="px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-bold transition-all"
                      >
                        {t("payment.tryAgain")}
                      </button>
                      <Link
                        to="/fleet"
                        className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-[#0F172A] text-[14px] font-bold hover:bg-slate-50 transition-all"
                      >
                        {t("payment.backToFleet")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleCancelReservation}
                        disabled={cancelling}
                        className="px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-[14px] font-bold transition-all disabled:opacity-50"
                      >
                        {cancelling
                          ? t("common.cancelling", { defaultValue: "Cancelling..." })
                          : t("payment.cancelReservation", { defaultValue: "Cancel & Free Vehicle" })}
                      </button>
                    </div>
                  </div>
                )}

                {(status === "preparing" || status === "verifying") && (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4">
                    <span className="w-5 h-5 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] font-semibold text-[#142B4A]">
                      {status === "preparing"
                        ? t("payment.preparing")
                        : t("payment.verifying")}
                    </p>
                  </div>
                )}

                {status === "ready" && (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handlePay}
                      className="w-full py-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[15px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      {t("payment.payButton")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelReservation}
                      disabled={cancelling}
                      className="w-full py-2.5 text-center text-xs text-red-600 hover:text-red-700 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {cancelling
                        ? t("common.cancelling", { defaultValue: "Cancelling..." })
                        : t("payment.cancelAndRelease", {
                            defaultValue: "Cancel reservation & release vehicle",
                          })}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
