import type {
  ConfirmationData,
  ConfirmationMeta,
  FareLine,
  TemplateValues,
} from "../types/bookingConfirmation";
import { getCheckout, computeCheckoutTotals } from "./checkoutData";

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lyd2 = (n: number) => `${fmt2(n)} LYD`;

const buildMeta = (
  vehicleTitle: string,
  days: number,
  paidTotal: string,
): ConfirmationMeta => ({
  crumbs: [
    { label: "nav.home", to: "/" },
    { label: "booking.crumbs.checkout" },
    { label: vehicleTitle },
    { label: "booking.crumbs.current" },
  ],
  stepBadge: { caption: "booking.stepBadge.caption", value: "booking.stepBadge.value" },
  success: {
    badge: "booking.success.badge",
    validation: "booking.success.validation",
    title: "booking.success.title",
    desc: "booking.success.desc",
    printLabel: "booking.success.printLabel",
    downloadLabel: "booking.success.downloadLabel",
    toastPrint: "booking.success.toastPrint",
    toastDownload: "booking.success.toastDownload",
  },
  reference: {
    label: "booking.reference.label",
    code: "NX-20481",
    copyToast: "booking.reference.copyToast",
    chips: [
      { icon: "encrypted", text: "booking.reference.chips.escrow" },
      { icon: "clock", text: "booking.reference.chips.instantDispatch" },
    ],
  },
  milestones: [
    {
      step: "booking.milestones.step1",
      status: "booking.milestones.statusDone",
      title: "booking.milestones.title1",
      detail: "booking.milestones.detail1",
      values: { amount: paidTotal },
      icon: "check",
      state: "done",
    },
    {
      step: "booking.milestones.step2",
      status: "booking.milestones.statusNext",
      title: "booking.milestones.title2",
      detail: "booking.milestones.detail2",
      icon: "car",
      state: "next",
    },
    {
      step: "booking.milestones.step3",
      status: "booking.milestones.statusScheduled",
      title: "booking.milestones.title3",
      detail: "booking.milestones.detail3",
      icon: "key",
      state: "pending",
    },
  ],
  vehicleCard: {
    badgePrimary: "booking.vehicle.badgeTier",
    badgeSecondary: "booking.vehicle.badgeSpec",
    gpsLabel: "booking.vehicle.gpsLabel",
    category: "booking.vehicle.category",
    vin: "VIN: WDD22306...89",
  },
  operator: {
    locationLabel: "booking.operator.location",
    ratingNote: "booking.operator.ratingNote",
    phoneLabel: "booking.operator.phoneLabel",
    phone: "+218 91 234 5678",
    phoneHref: "tel:+218912345678",
  },
  identification: {
    title: "booking.identification.title",
    driverName: "Tarek El-Mansouri",
    hotline: "+218 91 234 5678",
    email: "tarek.mansouri@...",
  },
  route: {
    title: "booking.route.title",
    days,
    daysBadge: "booking.route.daysBadge",
    pickup: {
      label: "booking.route.pickupLabel",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      datetime: "booking.route.pickupDatetime",
      note: "booking.route.pickupNote",
      icon: "land",
      primary: true,
    },
    dropoff: {
      label: "booking.route.dropoffLabel",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      datetime: "booking.route.dropoffDatetime",
      icon: "takeoff",
      primary: false,
    },
  },
  payment: {
    title: "booking.payment.title",
    paidBadge: "booking.payment.paidBadge",
    depositLabel: "booking.payment.depositLabel",
    depositAmount: "1,000.00 LYD",
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
        icon: "location",
        title: "booking.protocol.depot.title",
        body: "booking.protocol.depot.body",
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
      { label: "booking.dock.browseMore", to: "/FleetPage" },
      { icon: "arrowRight", label: "booking.dock.manage", to: "/FleetPage", primary: true },
    ],
  },
});

export const getBookingConfirmation = (vehicleId?: string): ConfirmationData => {
  const { vehicle, meta } = getCheckout(vehicleId);
  const days = meta.itinerary.days;
  const selected = new Set(meta.addons.filter((a) => a.defaultOn).map((a) => a.id));
  const totals = computeCheckoutTotals(vehicle, meta, selected);

  const fareLines: FareLine[] = [
    {
      label: "booking.fare.baseRental",
      amount: lyd2(totals.base),
      values: { price: vehicle.pricePerDay, days },
    },
    ...meta.addons
      .filter((a) => selected.has(a.id))
      .map<FareLine>((a) => {
        const perDay = a.unit === "day";
        const values: TemplateValues = perDay ? { price: a.price, days } : { price: a.price };
        return {
          label: perDay ? "booking.fare.addonDays" : "booking.fare.addonFlat",
          amount: lyd2(perDay ? a.price * days : a.price),
          nameKey: a.name,
          values,
        };
      }),
    {
      label: "booking.fare.municipalFee",
      amount: lyd2(totals.municipalFee),
    },
  ];

  return {
    vehicle,
    meta: buildMeta(vehicle.title, days, lyd2(totals.total)),
    fareLines,
    total: lyd2(totals.total),
    cardEnding: "8842",
    authRef: "TRX-99321-LY",
  };
};
