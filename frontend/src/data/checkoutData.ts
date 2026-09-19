import type { Vehicle } from "../types/vehicle";
import type {
  CheckoutData,
  CheckoutMeta,
  CheckoutTotals,
  FareLine,
} from "../types/checkout";
import { MOCK_VEHICLES } from "./vehicleData";

export const DEFAULT_CHECKOUT_VEHICLE: Vehicle = {
  id: "s-class-500",
  title: "Mercedes-Benz S-Class S 500 4MATIC",
  category: "Executive Flagship · Business Class",
  segment: "luxury",
  pricePerDay: 250,
  totalForPeriod: 750,
  periodDays: 3,
  image:
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=1000",
  location: "mji",
  body: "sedan",
  drive: "auto",
  operatorId: "safwa",
  operator: {
    id: "safwa",
    name: "Al-Safwa Elite Car Rental",
    initials: "AS",
    rating: 4.98,
    reviewsCount: 142,
    isVerified: true,
  },
  isInstantConfirmation: true,
  isTopPick: true,
  airportVip: true,
  badgeTag: "Executive Tier",
  badgeTagSecondary: "2024 Model",
  specs: {
    engine: "3.0L I6 MHEV",
    seats: "5 Seats",
    gearbox: "9G-TRONIC",
    fuel: "Hybrid Petrol",
  },
  perks: [
    "Complimentary Mitiga VIP Terminal delivery",
    "Chauffeur escort option available on request",
  ],
};

const TOTAL_LYD = (amount: number) =>
  `${amount.toLocaleString("en-US")} LYD`;

const CHECKOUT_META: CheckoutMeta = {
  stepLabel: "Step 2 of 2: Review & Secure Checkout",
  crumbs: [
    { label: "Fleet", to: "/FleetPage" },
    { label: "Tripoli Luxury" },
    { label: "Mercedes-Benz S-Class S 500" },
    { label: "Checkout" },
  ],
  backLabel: "Back to Vehicle Details",
  itinerary: {
    pickup: {
      icon: "land",
      label: "Pickup & Handover",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      date: "24 Oct 2024",
      time: "10:00 AM",
    },
    dropoff: {
      icon: "takeoff",
      label: "Return Depot",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      date: "27 Oct 2024",
      time: "10:00 AM",
    },
    days: 3,
    durationLabel: "3 Days Reserved (72 Hours)",
    cancelNote: "Free cancellation up to 24h prior to pickup",
    changeLabel: "Change Dates",
  },
  driverTitle: "Primary Driver Information",
  driverIntro:
    "Enter official details matching your Libyan National ID or International Passport and driving credential.",
  driverFields: [
    { id: "firstName", label: "First Name", placeholder: "First name", value: "Tarek" },
    { id: "lastName", label: "Last Name", placeholder: "Family name", value: "El-Mansouri" },
    {
      id: "email",
      label: "Email Address",
      placeholder: "Email for digital keys & vouchers",
      value: "tarek.mansouri@gmail.com",
      type: "email",
      badge: "Verified",
      badgeKind: "verified",
    },
    {
      id: "phone",
      label: "Libyan Mobile Phone",
      placeholder: "091 / 092 / 094",
      value: "91 234 5678",
      type: "tel",
      prefix: "+218",
      badge: "SMS Dispatch",
      badgeKind: "muted",
      hint: "Used for driver VIP pickup coordinator contact at Mitiga.",
    },
  ],
  driverConfirm: {
    prefix: "I confirm the primary driver is",
    strong: "25 years or older",
  },
  optionsTitle: "Selected Options & Protection",
  optionsIntro:
    "Tailor your executive reservation with premier roadside services and tailored protection.",
  addons: [
    {
      id: "insurance",
      name: "Comprehensive Zero-Deductible Coverage",
      description:
        "Full exterior shield, windshield glass, tires, and third-party liability without excess.",
      price: 45,
      unit: "day",
      recommended: true,
      defaultOn: true,
    },
    {
      id: "driver",
      name: "Additional Authorized Driver",
      description:
        "Share the steering wheel with an accredited colleague or family member.",
      price: 25,
      unit: "day",
      defaultOn: true,
    },
    {
      id: "childseat",
      name: "Child Safety Seat (ISOFIX Sanitized)",
      description: "Premium ergonomic seat suitable for infant to 4 years old, pre-installed.",
      price: 20,
      unit: "flat",
    },
    {
      id: "delivery",
      name: "Doorstep VIP Valet Handover",
      description:
        "Direct delivery to Corinthia Hotel, Radisson Blu, or private villa within Tripoli.",
      price: 50,
      unit: "flat",
    },
  ],
  payment: {
    lockLabel: "256-bit SSL PCI-DSS Encrypted",
    railLabel: "Accepted Payment Rails",
    rails: [
      { name: "Visa" },
      { name: "Mastercard" },
      { name: "Moamalat (معاملات)", highlight: true },
      { name: "Sadad" },
    ],
    cardFields: [
      {
        id: "cardholder",
        label: "Cardholder Name",
        placeholder: "NAME AS ON CARD",
        value: "TAREK EL MANSOURI",
        uppercase: true,
      },
      {
        id: "cardNumber",
        label: "Card Number",
        placeholder: "•••• •••• •••• 8842",
        value: "•••• •••• •••• 8842",
        badge: "VISA",
      },
      {
        id: "expiry",
        label: "Expires (MM/YY)",
        placeholder: "MM/YY",
        value: "08/27",
      },
      {
        id: "cvc",
        label: "CVC / CVV",
        placeholder: "123",
        value: "•••",
        type: "password",
      },
      {
        id: "billingCity",
        label: "Billing City",
        placeholder: "Tripoli",
        value: "Tripoli",
        span2: true,
        type: "text",
      },
    ],
    cardValueNote: "Tokenized & Verified",
    tabCardLabel: "Credit / Local Cards",
    tabCashLabel: "Pay on Pickup (Deposit)",
    cashDepositPercent: 20,
    cashNote: (title, deposit, remaining) =>
      `Reserve the ${title} today with a small 20% commitment charge (${TOTAL_LYD(
        deposit,
      )}). The remaining balance (${TOTAL_LYD(
        remaining,
      )}) can be settled in cash or via local point-of-sale terminal directly upon vehicle key collection at Mitiga VIP Desk.`,
    trustBadges: [
      { icon: "shield", text: "Libyan Central Bank Authorized" },
      { icon: "sms", text: "Instant Confirmation SMS" },
      { icon: "policy", text: "Zero Concealed Fees" },
    ],
  },
  municipalFee: 25,
  municipalLabel: "Municipal & Platform Service Fee",
  securityDeposit: {
    label: "Refundable Security Deposit",
    note: "Pre-authorization hold • Released on return",
    amount: 1000,
  },
  totalLabel: "Total Due Today",
  totalNote: "All applicable Libyan taxes included",
  ctaIdle: (total) => `Pay ${TOTAL_LYD(total)} & Confirm Booking`,
  ctaProcessing: "Securing Reservation & Authorization...",
  ctaDone: "Booking Confirmed! SMS Voucher Dispatched",
  secureNote: "Bank-grade encrypted transaction via Libyan Payment Network",
  agreementNote: (operator) =>
    `By clicking confirm, you agree to NexRide's Master Rental Agreement, Libyan Road Authority guidelines, and ${operator} Terms.`,
  valueProps: [
    { icon: "event", title: "Free Cancel", sub: "Up to 24h" },
    { icon: "car", title: "Exact Model", sub: "100% Guaranteed" },
    { icon: "support", title: "24/7 Libyan", sub: "VIP Hotline" },
  ],
};

export const getCheckout = (vehicleId?: string): CheckoutData => {
  const vehicle =
    MOCK_VEHICLES.find((v) => v.id === vehicleId) ?? DEFAULT_CHECKOUT_VEHICLE;
  const meta: CheckoutMeta = {
    ...CHECKOUT_META,
    crumbs: [
      { label: "Fleet", to: "/FleetPage" },
      { label: vehicle.segment === "luxury" ? "Tripoli Luxury" : "Tripoli Fleet" },
      { label: vehicle.title },
      { label: "Checkout" },
    ],
    itinerary: {
      ...CHECKOUT_META.itinerary,
      durationLabel: `${CHECKOUT_META.itinerary.days} Days Reserved (${CHECKOUT_META.itinerary.days * 24} Hours)`,
    },
  };
  return { vehicle, meta };
};

const buildFareLine = (
  id: string,
  label: string,
  note: string | null,
  amount: number,
): FareLine => ({ id, label: note ? `${label} (${note})` : label, amount });

export const computeCheckoutTotals = (
  vehicle: Vehicle,
  meta: CheckoutMeta,
  selectedAddonIds: Set<string>,
): CheckoutTotals => {
  const days = meta.itinerary.days;
  const base = vehicle.pricePerDay * days;
  const baseNote = `${vehicle.pricePerDay.toLocaleString("en-US")} LYD × ${days} days`;

  const addonLines: FareLine[] = meta.addons
    .filter((a) => selectedAddonIds.has(a.id))
    .map((a) =>
      buildFareLine(
        a.id,
        a.name,
        a.unit === "day" ? `${a.price} × ${days}` : null,
        a.unit === "day" ? a.price * days : a.price,
      ),
    );
  const addonsTotal = addonLines.reduce((sum, l) => sum + l.amount, 0);
  const municipalFee = meta.municipalFee;
  const total = base + addonsTotal + municipalFee;
  const refundableDeposit = meta.securityDeposit.amount;
  const cashDeposit = Math.round((total * meta.payment.cashDepositPercent) / 100);
  const cashRemaining = total - cashDeposit;

  return { base, baseNote, addonLines, addonsTotal, municipalFee, total, refundableDeposit, cashDeposit, cashRemaining };
};