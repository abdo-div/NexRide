import type { Vehicle } from "./vehicle";

export type CheckoutIconKey =
  | "land"
  | "takeoff"
  | "clock"
  | "timer"
  | "verified"
  | "calendar"
  | "shield"
  | "lock"
  | "credit"
  | "payments"
  | "wallet"
  | "sms"
  | "policy"
  | "lockReset"
  | "event"
  | "car"
  | "support"
  | "help"
  | "check"
  | "star";

export interface ItineraryStop {
  icon: CheckoutIconKey;
  label: string;
  location: string;
  date: string;
  time: string;
}

export interface RentalItinerary {
  pickup: ItineraryStop;
  dropoff: ItineraryStop;
  days: number;
  durationLabel: string;
  cancelNote: string;
  changeLabel: string;
}

export interface DriverField {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  type?: "text" | "email" | "tel" | "password";
  badge?: string;
  badgeKind?: "verified" | "muted";
  prefix?: string;
  hint?: string;
  span2?: boolean;
  uppercase?: boolean;
}

export interface AddonOption {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: "day" | "flat";
  recommended?: boolean;
  defaultOn?: boolean;
}

export interface PaymentRail {
  name: string;
  highlight?: boolean;
}

export interface TrustBadge {
  icon: CheckoutIconKey;
  text: string;
}

export interface PaymentMeta {
  lockLabel: string;
  railLabel: string;
  rails: PaymentRail[];
  cardFields: DriverField[];
  cardValueNote: string;
  tabCardLabel: string;
  tabCashLabel: string;
  cashDepositPercent: number;
  cashNote: (vehicleTitle: string, deposit: number, remaining: number) => string;
  trustBadges: TrustBadge[];
}

export interface ValueProp {
  icon: CheckoutIconKey;
  title: string;
  sub: string;
}

export interface CheckoutMeta {
  stepLabel: string;
  crumbs: { label: string; to?: string }[];
  backLabel: string;
  itinerary: RentalItinerary;
  driverTitle: string;
  driverIntro: string;
  driverFields: DriverField[];
  driverConfirm: { prefix: string; strong: string };
  optionsTitle: string;
  optionsIntro: string;
  addons: AddonOption[];
  payment: PaymentMeta;
  municipalFee: number;
  municipalLabel: string;
  securityDeposit: { label: string; note: string; amount: number };
  totalLabel: string;
  totalNote: string;
  ctaIdle: (total: number) => string;
  ctaProcessing: string;
  ctaDone: string;
  secureNote: string;
  agreementNote: (operator: string) => string;
  valueProps: ValueProp[];
}

export interface FareLine {
  id: string;
  label: string;
  amount: number;
}

export interface CheckoutTotals {
  base: number;
  baseNote: string;
  addonLines: FareLine[];
  addonsTotal: number;
  municipalFee: number;
  total: number;
  refundableDeposit: number;
  cashDeposit: number;
  cashRemaining: number;
}

export interface CheckoutData {
  vehicle: Vehicle;
  meta: CheckoutMeta;
}