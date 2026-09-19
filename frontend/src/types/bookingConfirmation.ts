import type { Vehicle } from "./vehicle";

export type ConfirmationIconKey =
  | "print"
  | "download"
  | "copy"
  | "verified"
  | "done"
  | "check"
  | "car"
  | "key"
  | "land"
  | "takeoff"
  | "call"
  | "sms"
  | "mail"
  | "speed"
  | "infinity"
  | "seat"
  | "settings"
  | "star"
  | "checkCircle"
  | "encrypted"
  | "clock"
  | "gps"
  | "shield"
  | "badge"
  | "location"
  | "restart"
  | "info"
  | "arrowLeft"
  | "arrowRight"
  | "credit"
  | "security";

export type MilestoneState = "done" | "next" | "pending";

export interface Milestone {
  step: string;
  status: string;
  title: string;
  detail: string;
  icon: ConfirmationIconKey;
  state: MilestoneState;
}

export interface SecurityChip {
  icon: ConfirmationIconKey;
  text: string;
}

export interface ReferenceBar {
  label: string;
  code: string;
  copyToast: string;
  chips: SecurityChip[];
}

export interface IdentificationCardItem {
  label: string;
  value: string;
  note: string;
  noteIcon: ConfirmationIconKey;
  primary: boolean;
}

export interface RouteStop {
  label: string;
  location: string;
  datetime: string;
  note?: string;
  icon: ConfirmationIconKey;
  primary: boolean;
}

export interface FareLine {
  label: string;
  amount: string;
}

export interface HandoverCard {
  icon: ConfirmationIconKey;
  title: string;
  body: string;
}

export interface DockAction {
  icon?: ConfirmationIconKey;
  label: string;
  to: string;
  primary?: boolean;
}

export interface ConfirmationMeta {
  crumbs: { label: string; to?: string }[];
  stepBadge: { caption: string; value: string };
  success: {
    badge: string;
    validation: string;
    title: string;
    desc: (vehicleTitle: string) => string;
    printLabel: string;
    downloadLabel: string;
    toastPrint: string;
    toastDownload: string;
  };
  reference: ReferenceBar;
  milestones: Milestone[];
  vehicleCard: {
    badgePrimary: string;
    badgeSecondary: string;
    gpsLabel: string;
    category: string;
    vin: string;
  };
  operator: {
    locationLabel: string;
    ratingNote: string;
    phoneLabel: string;
    phone: string;
    phoneHref: string;
  };
  identification: {
    title: string;
    driverName: string;
    hotline: string;
    email: string;
  };
  route: {
    title: string;
    daysBadge: string;
    pickup: RouteStop;
    dropoff: RouteStop;
  };
  payment: {
    title: string;
    paidBadge: string;
    depositLabel: string;
    depositAmount: string;
    totalLabel: string;
    totalNote: string;
    viaNote: string;
  };
  protocol: { title: string; subtitle: string; cards: HandoverCard[] };
  dock: { back: DockAction; actions: DockAction[] };
}

export interface ConfirmationData {
  vehicle: Vehicle;
  meta: ConfirmationMeta;
  fareLines: FareLine[];
  total: string;
  cardEnding: string;
  authRef: string;
}

export interface ToastState {
  visible: boolean;
  text: string;
}