import React, { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Download,
  Fuel,
  Gauge,
  KeyRound,
  Layers,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  Route,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useAdminData } from "../../hooks/useAdminData";
import { bookingsCsv, filterByHub } from "../../lib/adminMetrics";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
  saveBlobAsFile,
  vehicleTitle,
} from "../../lib/bookingView";
import { photoUrl } from "../../lib/vehicleMapper";
import { useAdminHub } from "../../context/adminHub";
import { StatusPill } from "../../components/admin/StatusPill";
import type { BookingDto } from "../../types/booking";
import type { AdminPaymentDto } from "../../types/admin";
import type { VehicleDto } from "../../types/vehicle";

interface TimelineStep {
  id: string;
  label: string;
  time: string;
  done: boolean;
  active: boolean;
  error?: boolean;
}

const vehicleDtoOf = (booking: BookingDto, vehicles: VehicleDto[]): VehicleDto | null => {
  const ref = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
  if (!ref) return null;
  return vehicles.find((v) => v._id === ref._id) ?? null;
};

const paymentOf = (booking: BookingDto, payments: AdminPaymentDto[]): AdminPaymentDto | null =>
  payments.find((p) => {
    if (typeof p.bookingId === "string") return p.bookingId === booking._id;
    return p.bookingId?._id === booking._id;
  }) ?? null;

export const AdminBookingDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data, loading, error, reload } = useAdminData();
  const { hub } = useAdminHub();

  const booking = useMemo(() => {
    if (!bookingId) return undefined;
    const scoped = filterByHub(data, hub).bookings.find((b) => b._id === bookingId);
    if (scoped) return scoped;
    return data.bookings.find((b) => b._id === bookingId) ?? undefined;
  }, [data, hub, bookingId]);

  const vehicle = useMemo(
    () => (booking ? vehicleDtoOf(booking, data.vehicles) : null),
    [booking, data.vehicles],
  );
  const vehicleRef =
    booking && typeof booking.vehicleId === "object" ? booking.vehicleId : null;
  const company =
    booking && typeof booking.companyId === "object" ? booking.companyId : null;
  const companyId = company?._id ?? "";
  const companyFull = company
    ? data.companies.find((c) => c._id === companyId) ?? null
    : null;
  const payment = useMemo(
    () => (booking ? paymentOf(booking, data.payments) : null),
    [booking, data.payments],
  );
  const customer =
    booking && typeof booking.customerId === "object" ? booking.customerId : null;

  const steps = useMemo<TimelineStep[]>(() => {
    if (!booking) return [];
    const lang = i18n.language;
    const paid = payment?.status === "COMPLETED";
    const list: TimelineStep[] = [
      {
        id: "created",
        label: t("admin.detail.stepCreated"),
        time: formatDate(booking.createdAt, lang, true),
        done: true,
        active: false,
      },
      {
        id: "payment",
        label: paid ? t("admin.detail.stepPaid") : t("admin.detail.stepPaymentPending"),
        time: paid
          ? formatDate(payment.paidAt ?? payment.createdAt ?? booking.createdAt, lang, true)
          : t("admin.detail.awaitingPayment"),
        done: paid,
        active: booking.bookingStatus === "PENDING_PAYMENT",
      },
      {
        id: "trip",
        label: t("admin.detail.stepTrip"),
        time: formatDate(booking.startDate, lang, true),
        done: booking.bookingStatus === "ACTIVE" || booking.bookingStatus === "COMPLETED",
        active: booking.bookingStatus === "PAID" || booking.bookingStatus === "CONFIRMED",
      },
      {
        id: "return",
        label: t("admin.detail.stepReturn"),
        time: formatDate(booking.endDate, lang, true),
        done: booking.bookingStatus === "COMPLETED",
        active: booking.bookingStatus === "ACTIVE",
      },
    ];

    const closed = booking.bookingStatus === "CANCELLED" || booking.bookingStatus === "EXPIRED";
    if (closed) {
      list.push({
        id: "closed",
        label: t("admin.detail.stepClosed"),
        time: booking.paymentStatus === "REFUNDED"
          ? t("admin.detail.refunded")
          : t("admin.detail.stepClosedMeta"),
        done: true,
        active: false,
        error: true,
      });
    }
    return list;
  }, [booking, payment, t, i18n.language]);

  const activeStep = steps.find((s) => s.active) ?? null;
  const completedCount = steps.filter((s) => s.done).length;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
        <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-6">
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
          <div className="col-span-4">
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    const subtitle = error
      ? t("admin.bookings.loadError")
      : t("admin.detail.notFoundBody");
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1440px] items-center justify-center px-8 py-8">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-10 py-12 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#2563EB]">
            <CalendarDays className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-[#0B1C30]">
            {t("admin.detail.notFoundTitle")}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[#565E74]">{subtitle}</p>
          <div className="mt-5 flex items-center gap-3">
            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1D4ED8]"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("admin.detail.backToLedger")}
            </Link>
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-[#2563EB]" />
              {t("admin.bookings.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lang = i18n.language;
  const photo = vehicle?.photos?.[0] ?? vehicleRef?.photos?.[0];
  const hero = photoUrl(photo);
  const providerInitials = (company?.name ?? "P")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "P";
  const customerInitials = (customer?.name ?? "C")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "C";

  const handleDownload = () => {
    saveBlobAsFile(
      new Blob([bookingsCsv([booking])], { type: "text/csv;charset=utf-8" }),
      `nexride-booking-${referenceCodeFrom(booking._id)}.csv`,
    );
  };

  const specCells: Array<{ label: string; value: string }> = [
    {
      label: t("admin.detail.specClass"),
      value: vehicle?.type ?? "—",
    },
    {
      label: t("admin.detail.specTransmission"),
      value: vehicle?.transmission ?? vehicleRef?.transmission ?? "—",
    },
    {
      label: t("admin.detail.specFuel"),
      value: vehicle?.fuelType ?? vehicleRef?.fuelType ?? "—",
    },
    {
      label: t("admin.detail.specSeats"),
      value: vehicle?.seats ? t("admin.detail.seatsCount", { count: vehicle.seats }) : "—",
    },
    {
      label: t("admin.detail.specCity"),
      value: companyFull?.city ?? vehicle?.city ?? "—",
    },
    {
      label: t("admin.detail.specRate"),
      value: `${formatLYD(booking.dailyRate)} LYD`,
    },
    {
      label: t("admin.detail.specRating"),
      value:
        vehicle && vehicle.ratingsQuantity > 0
          ? `${vehicle.ratingsAverage.toFixed(2)} (${vehicle.ratingsQuantity})`
          : "—",
    },
    {
      label: t("admin.detail.specDoors"),
      value: vehicle?.doors ? String(vehicle.doors) : "—",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* ------------------------------------------------------------------ */}
      {/* Breadcrumb bar */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2 text-sm text-[#565E74]">
          <Link
            to="/admin/bookings"
            className="flex items-center gap-1 font-semibold transition-colors hover:text-[#2563EB]"
          >
            <CalendarDays className="h-[18px] w-[18px]" />
            {t("admin.layout.navBookings")}
          </Link>
          <span className="flex items-center text-[#C3C6D7]">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </span>
          <span className="font-bold text-[#0B1C30]">#{referenceCodeFrom(booking._id)}</span>
          <span className="hidden text-[#565E74] sm:inline">({vehicleTitle(booking)})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-semibold text-[#565E74]">
            <Clock className="h-3.5 w-3.5" />
            {t("admin.detail.bookedOn", { date: formatDate(booking.createdAt, lang) })}
          </span>
          <StatusPill status={booking.bookingStatus} kind="booking" />
          <StatusPill status={booking.paymentStatus} kind="payment" />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Primary header & command deck */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
                {t("admin.detail.bookingTitle")} #{referenceCodeFrom(booking._id)}
              </h1>
              {booking.bookingStatus === "ACTIVE" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  {t("admin.detail.badgeActive")}
                </span>
              )}
              {payment?.status === "COMPLETED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EEFF] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("admin.detail.badgePaid")}
                </span>
              )}
              {companyFull?.status === "APPROVED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("admin.detail.badgeApproved")}
                </span>
              )}
            </div>
            <p className="max-w-2xl text-sm text-[#565E74]">
              {vehicleTitle(booking)} • {company?.city ?? companyFull?.city ?? booking.pickupLocation}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-colors hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
              {t("admin.detail.refresh")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {t("admin.detail.downloadCsv")}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Operational core grid */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (8/12) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* SECTION 1: Journey timeline */}
          <section className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                  <Route className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-[#0B1C30]">
                    {t("admin.detail.timelineTitle")}
                  </h2>
                  <p className="text-xs text-[#565E74]">{t("admin.detail.timelineSubtitle")}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {activeStep
                  ? t("admin.detail.stepProgress", {
                      current: completedCount + 1,
                      total: steps.length,
                    })
                  : t("admin.detail.stepComplete", { total: completedCount })}
              </span>
            </div>

            <ol className="relative space-y-5 before:absolute before:bottom-3 before:start-3 before:top-2 before:w-0.5 before:bg-[#D3E4FE]">
              {steps.map((step) => (
                <li key={step.id} className="relative">
                  <span
                    className={`absolute -start-[27px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-on-primary ring-4 ring-white ${
                      step.error
                        ? "bg-[#BA1A1A] text-white"
                        : step.active
                          ? "bg-emerald-500 text-white"
                          : step.done
                            ? "bg-[#2563EB] text-white"
                            : "bg-[#D3E4FE] text-[#565E74]"
                    }`}
                  >
                    {step.error ? (
                      <LockKeyhole className="h-3.5 w-3.5" />
                    ) : step.done || step.active ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </span>
                  {step.active && (
                    <span className="absolute -start-[19px] top-0.5 h-6 w-6 animate-ping rounded-full bg-emerald-400/50" />
                  )}
                  <div
                    className={`flex flex-col gap-1 rounded-xl p-3 sm:flex-row sm:items-baseline sm:justify-between ${
                      step.active ? "bg-[#EFF4FF]" : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        step.active ? "text-[#0B1C30]" : step.done ? "text-[#0B1C30]" : "text-[#565E74]"
                      }`}
                    >
                      {step.label}
                      {step.active && (
                        <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-800">
                          {t("admin.detail.activeNow")}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-xs ${step.active || step.error ? "font-bold text-[#2563EB]" : "text-[#565E74]"}`}
                    >
                      {step.time}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* SECTION 2: Vehicle & fleet */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="relative flex h-56 w-full items-end bg-[#EFF4FF] sm:h-64">
              <img
                src={hero}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C30]/85 via-[#0B1C30]/30 to-transparent" />
              <div className="relative z-10 flex w-full flex-wrap items-end justify-between gap-3 px-6 pb-5 text-white">
                <div>
                  <span className="inline-flex rounded bg-[#2563EB] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    {vehicle?.type ?? t("admin.detail.vehicleUnit")}
                  </span>
                  <h3 className="mt-1 text-xl font-extrabold">{vehicleTitle(booking)}</h3>
                  <p className="text-xs text-white/80">
                    {vehicle?.transmission ?? "—"} • {vehicle?.fuelType ?? "—"} •{" "}
                    {t("admin.detail.dailyRate", { value: formatLYD(booking.dailyRate) })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">
                    {companyFull?.city ?? vehicle?.city ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {specCells.map((cell) => (
                  <div key={cell.label} className="rounded-xl bg-[#EFF4FF] p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                      {cell.label}
                    </span>
                    <p className="mt-1 truncate text-sm font-bold text-[#0B1C30]">{cell.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5EEFF] text-lg font-extrabold text-[#2563EB]">
                    {providerInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-[#0B1C30]">
                        {company?.name ?? "—"}
                      </span>
                      {companyFull?.status === "APPROVED" && (
                        <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                      )}
                    </div>
                    <p className="text-xs text-[#565E74]">
                      {[companyFull?.city ?? company?.city, company?.phone]
                        .filter(Boolean)
                        .join(" • ") || "—"}
                    </p>
                  </div>
                </div>
                {companyFull?.status && (
                  <StatusPill status={companyFull.status} kind="company" />
                )}
              </div>
            </div>
          </section>

          {/* SECTION 3: Customer dossier */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[#2563EB]" />
                    <span className="text-[16px] font-extrabold text-[#0B1C30]">
                      {t("admin.detail.customerTitle")}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
                    {t("admin.detail.badgeCustomer")}
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E5EEFF] text-lg font-extrabold text-[#2563EB]">
                    {customerInitials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-[15px] font-bold text-[#0B1C30]">
                      {customer?.name ?? t("admin.drawer.unknown")}
                    </h4>
                    {customer?.phoneNumber && (
                      <p className="flex items-center gap-1 text-xs text-[#565E74]">
                        <Phone className="h-3.5 w-3.5" /> {customer.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="space-y-1 text-sm">
                  {customer?.email && (
                    <Row label={t("admin.detail.email")} value={customer.email}>
                      <Mail className="h-4 w-4 text-[#2563EB]" />
                    </Row>
                  )}
                  {customer?.phoneNumber && (
                    <Row label={t("admin.detail.phone")} value={customer.phoneNumber}>
                      <Phone className="h-4 w-4 text-[#2563EB]" />
                    </Row>
                  )}
                  <Row label={t("admin.detail.tripDates")} value={`${formatDate(booking.startDate, lang)} → ${formatDate(booking.endDate, lang)}`}>
                    <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                  </Row>
                  <Row label={t("admin.detail.pickupProtocol")} value={t(`admin.detail.pickup.${booking.pickupMethod}`)}>
                    <MapPin className="h-4 w-4 text-[#2563EB]" />
                  </Row>
                </dl>
              </div>
            </section>

            <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#2563EB]" />
                    <span className="text-[16px] font-extrabold text-[#0B1C30]">
                      {t("admin.detail.tripTitle")}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[11px] font-bold text-[#565E74]">
                    {t("admin.detail.duration", { count: booking.totalDays })}
                  </span>
                </div>

                <dl className="space-y-1 text-sm">
                  <Row label={t("admin.detail.pickupFrom")} value={booking.pickupLocation}>
                    <MapPin className="h-4 w-4 text-[#2563EB]" />
                  </Row>
                  <Row
                    label={t("admin.detail.specRate")}
                    value={`${formatLYD(booking.dailyRate)} LYD`}
                  >
                    <Banknote className="h-4 w-4 text-[#2563EB]" />
                  </Row>
                  <Row
                    label={t("admin.detail.rentalPeriod")}
                    value={`${formatDate(booking.startDate, lang)} — ${formatDate(booking.endDate, lang)}`}
                  >
                    <Gauge className="h-4 w-4 text-[#2563EB]" />
                  </Row>
                </dl>
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN (4/12) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* SECTION 4: Financial settlement */}
          <section className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-extrabold text-[#0B1C30]">
                  {t("admin.detail.financialTitle")}
                </h3>
              </div>
              <StatusPill status={booking.paymentStatus} kind="payment" size="sm" />
            </div>

            <div className="mb-4 rounded-xl bg-[#EFF4FF] p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("admin.detail.grossLabel")}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-[28px] font-extrabold leading-tight text-[#2563EB]">
                  {formatLYD(booking.totalAmount)}
                </span>
                <span className="text-sm font-bold text-[#0B1C30]">LYD</span>
              </div>
              {payment?.paidAt && (
                <p className="mt-1 text-xs text-[#565E74]">
                  {t("admin.detail.paidOn", { date: formatDate(payment.paidAt, lang, true) })}
                </p>
              )}
            </div>

            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.detail.invoiceTitle")}
            </span>
            <dl className="mb-5 space-y-1.5 text-sm">
              <Row
                label={t("admin.detail.baseRental", {
                  days: booking.totalDays,
                  rate: formatLYD(booking.dailyRate),
                })}
                value={`${formatLYD(booking.rentalPrice)} LYD`}
              >
                <Gauge className="h-4 w-4 text-[#2563EB]" />
              </Row>
              {booking.discountAmount > 0 && (
                <Row
                  label={t("admin.drawer.discount")}
                  value={`− ${formatLYD(booking.discountAmount)} LYD`}
                >
                  <Banknote className="h-4 w-4 text-[#2563EB]" />
                </Row>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <dt className="font-bold text-[#0B1C30]">{t("admin.drawer.total")}</dt>
                <dd className="font-extrabold text-[#0B1C30]">
                  {formatLYD(booking.totalAmount)} LYD
                </dd>
              </div>
            </dl>

            <div className="mb-4 space-y-2 rounded-xl bg-[#EFF4FF] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  {t("admin.detail.splitTitle")}
                </span>
                <KeyRound className="h-4 w-4 text-[#2563EB]" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-bold text-[#0B1C30]">
                    {t("admin.detail.feeLabel", { rate: booking.commissionRate })}
                  </p>
                  <span className="text-[11px] text-[#565E74]">{t("admin.detail.feeDetail")}</span>
                </div>
                <span className="text-sm font-extrabold text-[#2563EB]">
                  {formatLYD(booking.commissionAmount)} LYD
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2">
                <div>
                  <p className="font-bold text-[#0B1C30]">
                    {t("admin.detail.partnerLabel")}
                  </p>
                  <span className="text-[11px] text-[#565E74]">
                    {payment?.payoutStatus
                      ? t(`admin.status.${payment.payoutStatus}`)
                      : t("admin.detail.pendingSettlement")}
                  </span>
                </div>
                <span className="text-sm font-extrabold text-[#0B1C30]">
                  {formatLYD(booking.companyShare)} LYD
                </span>
              </div>
            </div>

            {payment?.paymentMethod && (
              <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-[#565E74]">{t("admin.detail.paymentMethod")}:</span>
                <span className="font-bold uppercase text-[#0B1C30]">
                  {payment.paymentMethod}
                </span>
              </div>
            )}
          </section>

          {/* SECTION 5: Dispatch snapshot */}
          <section className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-[16px] font-extrabold text-[#0B1C30]">
                {t("admin.detail.snapshotTitle")}
              </h3>
            </div>

            <dl className="space-y-1 text-sm">
              <Row label={t("admin.detail.createdOn")} value={formatDate(booking.createdAt, lang, true)}>
                <Clock className="h-4 w-4 text-[#2563EB]" />
              </Row>
              <Row label={t("admin.detail.updatedOn")} value={formatDate(booking.updatedAt ?? booking.createdAt, lang, true)}>
                <RefreshCw className="h-4 w-4 text-[#2563EB]" />
              </Row>
              <Row label={t("admin.detail.hubLabel")} value={companyFull?.city ?? company?.city ?? "—"}>
                <Building2 className="h-4 w-4 text-[#2563EB]" />
              </Row>
              <Row label={t("admin.detail.protocol")} value={t(`admin.detail.pickup.${booking.pickupMethod}`)}>
                <MapPin className="h-4 w-4 text-[#2563EB]" />
              </Row>
            </dl>

            <div className="mt-4 space-y-2 text-sm">
              {payment && (
                <div className="flex items-center justify-between rounded-xl bg-[#EFF4FF] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#565E74]">
                    {t("admin.detail.ledger")}
                  </span>
                  <span className="font-extrabold text-[#0B1C30]">
                    {formatLYD(payment.amount)} LYD
                  </span>
                </div>
              )}
              <Link
                to="/admin/bookings"
                className="flex w-full items-center justify-between rounded-xl bg-[#EFF4FF] px-4 py-3 text-sm font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF]"
              >
                <span className="flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  {t("admin.detail.backToLedger")}
                </span>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  children?: React.ReactNode;
}> = ({ label, value, children }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#EFF4FF] px-3 py-1.5">
    <dt className="flex items-center gap-1.5 text-xs text-[#565E74]">
      {children}
      <span>{label}</span>
    </dt>
    <dd className="truncate text-right text-xs font-bold text-[#0B1C30] sm:max-w-[55%]">
      {value}
    </dd>
  </div>
);

export default AdminBookingDetailPage;