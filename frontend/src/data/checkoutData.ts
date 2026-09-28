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

const CHECKOUT_META: CheckoutMeta = {
  stepLabel: "checkout.header.stepLabel",
  crumbs: [
    { label: "checkout.header.crumbs.fleet", to: "/FleetPage" },
    { label: "checkout.header.crumbs.tripoliLuxury" },
    { label: "Mercedes-Benz S-Class S 500" },
    { label: "checkout.header.crumbs.checkout" },
  ],
  backLabel: "checkout.header.backLabel",
  itinerary: {
    pickup: {
      icon: "land",
      label: "checkout.itinerary.pickupLabel",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      date: "24 Oct 2024",
      time: "10:00 AM",
    },
    dropoff: {
      icon: "takeoff",
      label: "checkout.itinerary.dropoffLabel",
      location: "Tripoli Mitiga VIP Terminal (TIP)",
      date: "27 Oct 2024",
      time: "10:00 AM",
    },
    days: 3,
    durationLabel: "checkout.itinerary.durationLabel",
    cancelNote: "checkout.itinerary.cancelNote",
    changeLabel: "checkout.itinerary.changeLabel",
  },
  driverTitle: "checkout.driver.title",
  driverIntro: "checkout.driver.intro",
  driverFields: [
    {
      id: "firstName",
      label: "checkout.driver.fields.firstName.label",
      placeholder: "checkout.driver.fields.firstName.placeholder",
      value: "Tarek",
    },
    {
      id: "lastName",
      label: "checkout.driver.fields.lastName.label",
      placeholder: "checkout.driver.fields.lastName.placeholder",
      value: "El-Mansouri",
    },
    {
      id: "email",
      label: "checkout.driver.fields.email.label",
      placeholder: "checkout.driver.fields.email.placeholder",
      value: "tarek.mansouri@gmail.com",
      type: "email",
      badge: "checkout.driver.fields.email.badge",
      badgeKind: "verified",
    },
    {
      id: "phone",
      label: "checkout.driver.fields.phone.label",
      placeholder: "checkout.driver.fields.phone.placeholder",
      value: "91 234 5678",
      type: "tel",
      prefix: "+218",
      badge: "checkout.driver.fields.phone.badge",
      badgeKind: "muted",
      hint: "checkout.driver.fields.phone.hint",
    },
  ],
  driverConfirm: {
    prefix: "checkout.driver.confirmPrefix",
    strong: "checkout.driver.confirmAge",
  },
  optionsTitle: "checkout.options.title",
  optionsIntro: "checkout.options.intro",
  addons: [
    {
      id: "insurance",
      name: "checkout.options.addons.insurance.name",
      description: "checkout.options.addons.insurance.description",
      price: 45,
      unit: "day",
      recommended: true,
      defaultOn: true,
    },
    {
      id: "driver",
      name: "checkout.options.addons.driver.name",
      description: "checkout.options.addons.driver.description",
      price: 25,
      unit: "day",
      defaultOn: true,
    },
    {
      id: "childseat",
      name: "checkout.options.addons.childseat.name",
      description: "checkout.options.addons.childseat.description",
      price: 20,
      unit: "flat",
    },
    {
      id: "delivery",
      name: "checkout.options.addons.delivery.name",
      description: "checkout.options.addons.delivery.description",
      price: 50,
      unit: "flat",
    },
  ],
  payment: {
    lockLabel: "checkout.payment.lockLabel",
    railLabel: "checkout.payment.railLabel",
    rails: [
      { name: "Visa" },
      { name: "Mastercard" },
      { name: "Moamalat (معاملات)", highlight: true },
      { name: "Sadad" },
    ],
    cardFields: [
      {
        id: "cardholder",
        label: "checkout.payment.cardFields.cardholder.label",
        placeholder: "checkout.payment.cardFields.cardholder.placeholder",
        value: "TAREK EL MANSOURI",
        uppercase: true,
      },
      {
        id: "cardNumber",
        label: "checkout.payment.cardFields.cardNumber.label",
        placeholder: "checkout.payment.cardFields.cardNumber.placeholder",
        value: "•••• •••• •••• 8842",
        badge: "VISA",
      },
      {
        id: "expiry",
        label: "checkout.payment.cardFields.expiry.label",
        placeholder: "checkout.payment.cardFields.expiry.placeholder",
        value: "08/27",
      },
      {
        id: "cvc",
        label: "checkout.payment.cardFields.cvc.label",
        placeholder: "checkout.payment.cardFields.cvc.placeholder",
        value: "•••",
        type: "password",
      },
      {
        id: "billingCity",
        label: "checkout.payment.cardFields.billingCity.label",
        placeholder: "checkout.payment.cardFields.billingCity.placeholder",
        value: "Tripoli",
        span2: true,
        type: "text",
      },
    ],
    cardValueNote: "checkout.payment.cardValueNote",
    tabCardLabel: "checkout.payment.tabCardLabel",
    tabCashLabel: "checkout.payment.tabCashLabel",
    cashDepositPercent: 20,
    cashNote: "checkout.payment.cashNote",
    trustBadges: [
      { icon: "shield", text: "checkout.payment.trustBadges.centralBank" },
      { icon: "sms", text: "checkout.payment.trustBadges.instantSms" },
      { icon: "policy", text: "checkout.payment.trustBadges.zeroFees" },
    ],
  },
  municipalFee: 25,
  municipalLabel: "checkout.summary.municipalLabel",
  securityDeposit: {
    label: "checkout.summary.depositLabel",
    note: "checkout.summary.depositNote",
    amount: 1000,
  },
  totalLabel: "checkout.summary.totalLabel",
  totalNote: "checkout.summary.totalNote",
  ctaIdle: "checkout.summary.ctaIdle",
  ctaProcessing: "checkout.summary.ctaProcessing",
  ctaDone: "checkout.summary.ctaDone",
  secureNote: "checkout.summary.secureNote",
  agreementNote: "checkout.summary.agreementNote",
  valueProps: [
    {
      icon: "event",
      title: "checkout.summary.valueProps.freeCancel.title",
      sub: "checkout.summary.valueProps.freeCancel.sub",
    },
    {
      icon: "car",
      title: "checkout.summary.valueProps.exactModel.title",
      sub: "checkout.summary.valueProps.exactModel.sub",
    },
    {
      icon: "support",
      title: "checkout.summary.valueProps.hotline.title",
      sub: "checkout.summary.valueProps.hotline.sub",
    },
  ],
};

export const getCheckout = (vehicleId?: string): CheckoutData => {
  const vehicle =
    MOCK_VEHICLES.find((v) => v.id === vehicleId) ?? DEFAULT_CHECKOUT_VEHICLE;
  const meta: CheckoutMeta = {
    ...CHECKOUT_META,
    crumbs: [
      { label: "checkout.header.crumbs.fleet", to: "/FleetPage" },
      {
        label:
          vehicle.segment === "luxury"
            ? "checkout.header.crumbs.tripoliLuxury"
            : "checkout.header.crumbs.tripoliFleet",
      },
      { label: vehicle.title },
      { label: "checkout.header.crumbs.checkout" },
    ],
  };
  return { vehicle, meta };
};

const buildFareLine = (
  id: string,
  labelKey: string,
  note: string | null,
  amount: number,
): FareLine => ({ id, labelKey, note, amount });

export const computeCheckoutTotals = (
  vehicle: Vehicle,
  meta: CheckoutMeta,
  selectedAddonIds: Set<string>,
): CheckoutTotals => {
  const days = meta.itinerary.days;
  const base = vehicle.pricePerDay * days;
  const baseNote = "checkout.summary.baseNote";

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
