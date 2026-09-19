import type { ConfirmationData, ConfirmationMeta, FareLine } from "../types/bookingConfirmation";
import { getCheckout, computeCheckoutTotals } from "./checkoutData";

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lyd2 = (n: number) => `${fmt2(n)} LYD`;

const buildMeta = (
  vehicleTitle: string,
  days: number,
  paidTotal: string,
): ConfirmationMeta => ({
  crumbs: [
    { label: "Home", to: "/" },
    { label: "Checkout" },
    { label: vehicleTitle },
    { label: "Booking Confirmation" },
  ],
  stepBadge: { caption: "Step 3 of 3:", value: "Secured & Verified" },
  success: {
    badge: "Confirmed",
    validation: "Libya National Transport Authority Validated",
    title: "Booking Confirmed",
    desc: (title) =>
      `Your ${title} reservation is secured. Confirmation SMS and downloadable digital travel credentials have been dispatched to your verified contacts.`,
    printLabel: "Print Voucher",
    downloadLabel: "Download Digital PDF",
    toastPrint: "Voucher opened for print",
    toastDownload: "Generating official PDF voucher...",
  },
  reference: {
    label: "Booking Reference:",
    code: "NX-20481",
    copyToast: "Booking reference copied to clipboard",
    chips: [
      { icon: "encrypted", text: "Moamalat Secured Escrow" },
      { icon: "clock", text: "Instant Host Dispatch" },
    ],
  },
  milestones: [
    {
      step: "Step 01",
      status: "Completed",
      title: "Payment & Reservation",
      detail: `Paid ${paidTotal} • 24 Oct 2024`,
      icon: "check",
      state: "done",
    },
    {
      step: "Step 02",
      status: "Next Action",
      title: "Handover & Key Delivery",
      detail: "24 Oct 2024 · 10:00 AM at Mitiga VIP",
      icon: "car",
      state: "next",
    },
    {
      step: "Step 03",
      status: "Scheduled",
      title: "Vehicle Return",
      detail: "27 Oct 2024 · 10:00 AM (Mitiga)",
      icon: "key",
      state: "pending",
    },
  ],
  vehicleCard: {
    badgePrimary: "Executive Tier",
    badgeSecondary: "2024 Specification",
    gpsLabel: "GPS & Telematics Active",
    category: "Full-Size Luxury Sedan",
    vin: "VIN: WDD22306...89",
  },
  operator: {
    locationLabel: "Tripoli Central",
    ratingNote: "142 verified bookings",
    phoneLabel: "Contact Depot Dispatch",
    phone: "+218 91 234 5678",
    phoneHref: "tel:+218912345678",
  },
  identification: {
    title: "Renter & Operator Identification",
    driverName: "Tarek El-Mansouri",
    hotline: "+218 91 234 5678",
    email: "tarek.mansouri@...",
  },
  route: {
    title: "Trip Route & Schedule",
    daysBadge: `${days} Days / ${days * 24} Hours`,
    pickup: {
      label: "Pick-Up Depot",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      datetime: "Thursday, 24 Oct 2024 · 10:00 AM",
      note: "Meet & Greet coordinator waiting at Terminal 1 Executive Arrivals lounge with passenger placard.",
      icon: "land",
      primary: true,
    },
    dropoff: {
      label: "Drop-Off Depot",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      datetime: "Sunday, 27 Oct 2024 · 10:00 AM",
      icon: "takeoff",
      primary: false,
    },
  },
  payment: {
    title: "Payment Summary",
    paidBadge: "Paid in Full",
    depositLabel: "Refundable Deposit (Escrow Pre-auth)",
    depositAmount: "1,000.00 LYD",
    totalLabel: "Total Settled",
    totalNote: "Via Moamalat / Libyan Card",
    viaNote: "Paid using Card ending in",
  },
  protocol: {
    title: "Arrival & Handover Protocol",
    subtitle: "Review the essential checklist for seamless key exchange at Mitiga Airport VIP Terminal.",
    cards: [
      {
        icon: "badge",
        title: "Mandatory Documents",
        body: "Bring your physical Driver's License, Original Passport or Libyan National Identity Card, and the digital token on this screen.",
      },
      {
        icon: "location",
        title: "Designated Depot Bay",
        body: "Mitiga Airport VIP Arrival Terminal, Dedicated Executive Parking Lot C, Bay 14. Dispatch assistant will be waiting.",
      },
      {
        icon: "restart",
        title: "Cancellation Policy",
        body: "Free 100% refund available up to 24 hours prior to scheduled departure (before 23 Oct 2024, 10:00 AM).",
      },
    ],
  },
  dock: {
    back: { icon: "arrowLeft", label: "Back to Marketplace", to: "/" },
    actions: [
      { label: "Browse More Vehicles", to: "/FleetPage" },
      { icon: "arrowRight", label: "Manage Reservation", to: "/FleetPage", primary: true },
    ],
  },
});

export const getBookingConfirmation = (vehicleId?: string): ConfirmationData => {
  const { vehicle, meta } = getCheckout(vehicleId);
  const days = meta.itinerary.days;
  const selected = new Set(meta.addons.filter((a) => a.defaultOn).map((a) => a.id));
  const totals = computeCheckoutTotals(vehicle, meta, selected);

  const fareLines: FareLine[] = [
    { label: `Vehicle Base Rental (${vehicle.pricePerDay} LYD × ${days} days)`, amount: lyd2(totals.base) },
    ...meta.addons
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        label: `${a.name} (${a.price} LYD × ${a.unit === "day" ? days : "flat"})`,
        amount: lyd2(a.unit === "day" ? a.price * days : a.price),
      })),
    {
      label: "Municipal Fleet Fee & Platform Tax",
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