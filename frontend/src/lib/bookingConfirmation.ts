import type { BookingDto } from "../types/booking";
import type { Vehicle } from "../types/vehicle";
import type { ConfirmationData, ConfirmationMeta, FareLine, Milestone } from "../types/bookingConfirmation";
import { referenceCodeFrom } from "./bookingView";
const lyd2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " LYD";
export const buildConfirmation = (
  booking: BookingDto,
  vehicle: Vehicle,
  isCashPending: boolean,
  lang: string,
): ConfirmationData => {
  const customer = typeof booking.customerId === "object" ? booking.customerId : null;
  const company = typeof booking.companyId === "object" ? booking.companyId : null;
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const isPaid = booking.paymentStatus === "PAID";

  const fmtDateTime = (date: Date) => {
    const datePart = new Intl.DateTimeFormat(lang, {
      timeZone: "Africa/Tripoli",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
    const timePart = new Intl.DateTimeFormat(lang, {
      timeZone: "Africa/Tripoli",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `${datePart} · ${timePart}`;
  };

  const pickupLocation =
    booking.pickupLocation || vehicle.perks[0] || vehicle.title;

  const milestones: Milestone[] = [
    {
      step: "booking.milestones.step1",
      status: isPaid
        ? "booking.milestones.statusDone"
        : "booking.milestones.statusNext",
      title: "booking.milestones.title1",
      detail: isPaid
        ? "booking.milestones.detail1"
        : isCashPending
          ? "booking.milestones.detailCashPending"
          : "booking.milestones.detailPaymentPending",
      values: { amount: lyd2(booking.totalAmount) },
      icon: "check",
      state: isPaid ? "done" : "next",
    },
    {
      step: "booking.milestones.step2",
      status: isPaid
        ? "booking.milestones.statusNext"
        : "booking.milestones.statusScheduled",
      title: "booking.milestones.title2",
      detail: "booking.milestones.detail2",
      icon: "car",
      state: isPaid ? "next" : "pending",
    },
    {
      step: "booking.milestones.step3",
      status: "booking.milestones.statusScheduled",
      title: "booking.milestones.title3",
      detail: "booking.milestones.detail3",
      icon: "key",
      state: "pending",
    },
  ];

  const fareLines: FareLine[] = [
    {
      label: "booking.fare.baseRental",
      amount: lyd2(booking.rentalPrice),
      values: { price: booking.dailyRate, days: booking.totalDays },
    },
  ];
  for (const addon of booking.addons ?? []) {
    fareLines.push({ label: "booking.fare.addon", nameKey: "checkout.options.addons." + addon.id + ".name", amount: lyd2(addon.amount) });
  }
  if (booking.municipalFee) {
    fareLines.push({ label: "checkout.summary.municipalLabel", amount: lyd2(booking.municipalFee) });
  }
  if (booking.discountAmount > 0) {
    fareLines.push({
      label: "booking.fare.discount",
      amount: `-${lyd2(booking.discountAmount)}`,
    });
  }

  const meta: ConfirmationMeta = {
    crumbs: [
      { label: "nav.home", to: "/" },
      { label: "booking.crumbs.checkout" },
      { label: vehicle.title },
      { label: "booking.crumbs.current" },
    ],
    stepBadge: {
      caption: "booking.stepBadge.caption",
      value: "booking.stepBadge.value",
    },
    success: {
      badge: isPaid ? "booking.success.badge" : "booking.payment.pendingBadge",
      validation: "booking.success.validation",
      title: isPaid ? "booking.success.title" : "booking.success.pendingTitle",
      desc: isPaid ? "booking.success.desc" : "booking.success.pendingDesc",
      printLabel: "booking.success.printLabel",
      downloadLabel: "booking.success.downloadLabel",
      downloadBusyLabel: "booking.success.downloadBusyLabel",
      toastPrint: "booking.success.toastPrint",
      toastDownload: "booking.success.toastDownload",
    },
    reference: {
      label: "booking.reference.label",
      code: referenceCodeFrom(booking._id),
      copyToast: "booking.reference.copyToast",
      chips: [],
    },
    milestones,
    vehicleCard: {
      badgePrimary: "booking.vehicle.badgeTier",
      badgeSecondary: vehicle.specs.fuel,
      gpsLabel: "booking.vehicle.gpsLabel",
      category: vehicle.category,
      vin: "",
    },
    operator: {
      locationLabel: company?.city || vehicle.operator.name,
      ratingNote: "booking.operator.ratingNote",
      phoneLabel: "booking.operator.phoneLabel",
      phone: company?.phone || "—",
      phoneHref: company?.phone ? `tel:${company.phone}` : "",
    },
    identification: {
      title: "booking.identification.title",
      driverName: booking.primaryDriver ? [booking.primaryDriver.firstName, booking.primaryDriver.lastName].join(" ") : customer?.name || "—",
      hotline: company?.phone || "—",
      email: booking.primaryDriver?.email || customer?.email || "—",
    },
    route: {
      title: "booking.route.title",
      days,
      daysBadge: "booking.route.daysBadge",
      pickup: {
        label: "booking.route.pickupLabel",
        location: pickupLocation,
        datetime: fmtDateTime(start),
        note: undefined,
        icon: "land",
        primary: true,
      },
      dropoff: {
        label: "booking.route.dropoffLabel",
        location: pickupLocation,
        datetime: fmtDateTime(end),
        icon: "takeoff",
        primary: false,
      },
    },
    payment: {
      title: "booking.payment.title",
      paidBadge: "booking.payment.paidBadge",
      depositLabel: "booking.payment.depositLabel",
      depositAmount: "",
      totalLabel: "booking.payment.totalLabel",
      totalNote: "booking.payment.totalNote",
      viaNote: "booking.payment.viaNote",
    },
    protocol: {
      title: "booking.protocol.title",
      subtitle: "booking.protocol.subtitle",
      cards: [
        {
          icon: "badge",
          title: "booking.protocol.documents.title",
          body: "booking.protocol.documents.body",
        },

        {
          icon: "restart",
          title: "booking.protocol.cancellation.title",
          body: "booking.protocol.cancellation.body",
        },
      ],
    },
    dock: {
      back: { icon: "arrowLeft", label: "booking.dock.back", to: "/" },
      actions: [
        { label: "booking.dock.browseMore", to: "/fleet" },
        {
          icon: "arrowRight",
          label: "booking.dock.manage",
          to: "/my-bookings",
          primary: true,
        },
      ],
    },
  };

  return {
    vehicle,
    meta,
    fareLines,
    total: lyd2(booking.totalAmount),
    // The booking document does not carry card/auth details; the paid summary
    // hides this line when it is empty rather than inventing one.
    cardEnding: "",
    authRef: "",
  };
};
