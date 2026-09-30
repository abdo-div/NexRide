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
import type { BookingDto } from "../types/booking";
import { moamalatApi } from "../lib/moamalatApi";
import {
  loadMoamalatLightbox,
  openMoamalatLightbox,
} from "../lib/moamalatLightbox";

type PaymentStatus =
  | "loading"
  | "notfound"
  | "ready"
  | "preparing"
  | "verifying"
  | "cancelled"
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

const PaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    bookingApi
      .get(bookingId)
      .then((result) => {
        if (!active) return;
        setBooking(result.data.booking);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("notfound");
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking || booking.paymentStatus === "PAID") return;
    void loadMoamalatLightbox().catch(() => undefined);
  }, [booking]);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

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
      } else {
        setStatus("failed");
        setError(result.data?.reason || t("payment.gatewayNotApproved"));
      }
    } catch (err) {
      setStatus("failed");
      setError(
        err instanceof Error ? err.message : t("payment.gatewayError"),
      );
    }
  };

  const handlePay = async () => {
    if (!booking) return;
    setError(null);
    setStatus("preparing");
    try {
      await loadMoamalatLightbox();
      const init = await moamalatApi.initiate(booking._id);
      openMoamalatLightbox(init.data.gateway.params, {
        onComplete: (response) => {
          handleVerified(init.data.payment.merchantReference, response);
        },
        onError: () => setStatus("gatewayError"),
        onCancel: () => setStatus("cancelled"),
      });
    } catch (err) {
      setStatus("gatewayError");
      setError(err instanceof Error ? err.message : t("payment.gatewayError"));
    }
  };

  // -------------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="pt-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <span className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
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
              className="flex items-center gap-2 text-[#2563EB] font-bold text-sm"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t("checkout.unavailable.browse")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Booking already settled elsewhere (e.g. cash/Stripe or a previous attempt).
  const alreadyPaid = booking.paymentStatus === "PAID";

  const vehicleTitle = vehicleTitleOf(booking) || t("payment.vehicle");
  const bookingVehicleId = vehicleIdOf(booking);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="pt-20">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-6 pb-8">
          <Link
            to={`/vehicles/${bookingVehicleId}`}
            className="inline-flex items-center gap-2 text-[#2563EB] font-bold text-sm"
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
                <CreditCard className="w-6 h-6 text-[#2563EB]" />
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
                      <CalendarDays className="w-4 h-4 text-[#2563EB]" />
                      {`${fmtDate(booking.startDate)} - ${fmtDate(booking.endDate)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold text-[#94A3B8] uppercase">
                      {t("payment.location")}
                    </dt>
                    <dd className="flex items-center gap-2 text-[15px] font-semibold text-[#0F172A] mt-1">
                      <MapPin className="w-4 h-4 text-[#2563EB]" />
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

                {(status === "cancelled" ||
                  status === "failed" ||
                  status === "gatewayError") && (
                  <div
                    className={`flex flex-col gap-3 rounded-xl p-5 ${
                      status === "cancelled"
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p
                      className={`text-[15px] font-bold ${
                        status === "cancelled"
                          ? "text-amber-800"
                          : "text-red-700"
                      }`}
                    >
                      {status === "cancelled"
                        ? t("payment.cancelledTitle")
                        : t("payment.gatewayTitle")}
                    </p>
                    <p
                      className={`text-[13px] leading-relaxed ${
                        status === "cancelled"
                          ? "text-amber-700"
                          : "text-red-600"
                      }`}
                    >
                      {status === "cancelled"
                        ? t("payment.cancelledDesc")
                        : error || t("payment.gatewayDesc")}
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
                    </div>
                  </div>
                )}

                {(status === "preparing" || status === "verifying") && (
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
                    <span className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] font-semibold text-[#2563EB]">
                      {status === "preparing"
                        ? t("payment.preparing")
                        : t("payment.verifying")}
                    </p>
                  </div>
                )}

                {status === "ready" && (
                  <button
                    type="button"
                    onClick={handlePay}
                    className="w-full py-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[15px] font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    {t("payment.payButton")}
                  </button>
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