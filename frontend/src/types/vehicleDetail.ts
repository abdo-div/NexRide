import type { Vehicle } from "./vehicle";

export type DetailIconKey =
  | "settings"
  | "zap"
  | "armchair"
  | "fuel"
  | "compass"
  | "luggage"
  | "shield"
  | "gauge"
  | "user"
  | "credit"
  | "docs"
  | "map"
  | "plane"
  | "building"
  | "badge"
  | "check"
  | "lock"
  | "life";

export interface DetailBadge {
  kind: "instant" | "plain";
  text: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  label?: string;
  master?: boolean;
  headline?: string;
  meta?: string;
}

export interface DetailMetric {
  icon: DetailIconKey;
  label: string;
  value: string;
  sub: string;
}

export interface SpecRow {
  label: string;
  value: string;
  accent?: boolean;
}

export interface SpecGroup {
  icon: DetailIconKey;
  title: string;
  rows: SpecRow[];
}

export interface Requirement {
  icon: DetailIconKey;
  title: string;
  body: string;
}

export interface Hub {
  icon: "plane" | "building";
  name: string;
  description: string;
}

export interface OperatorInfo {
  name: string;
  meta: string;
  rating: number;
  completedRentals: string;
  responseTime: string;
}

export interface RatingBar {
  label: string;
  score: string;
  percent: number;
}

export interface Review {
  author: string;
  initials: string;
  avatarClass: string;
  context: string;
  timeAgo: string;
  body: string;
}

export interface SimilarCar {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string;
  pricePerDay: number;
  specs: { label: string; value: string }[];
}

export interface ProtectionPlan {
  id: string;
  name: string;
  description: string;
  priceNote: string;
  pricePerDay: number;
  included?: boolean;
}

export interface BookingTimes {
  pickupDefault: string;
  returnDefault: string;
  pickupTimes: string[];
  returnTimes: string[];
  deliveryPoints: string[];
}

export interface TrustSignal {
  icon: "check" | "lock" | "shield";
  text: string;
}

export interface VehicleDetail {
  id: string;
  vehicle: Vehicle;
  crumbs: string[];
  badges: DetailBadge[];
  ratingScore: string;
  ratingCount: string;
  ratingReviews: string;
  operatorTier: string;
  locationLine: string;
  liveStatus: { label: string; caption: string; color: "amber" | "green" };
  gallery: GalleryImage[];
  metrics: DetailMetric[];
  descriptionHeading: string;
  descriptionParagraphs: string[];
  features: string[];
  specGroups: SpecGroup[];
  policyMeta: string;
  requirements: Requirement[];
  hubBadge: string;
  hubs: Hub[];
  mapImage?: string;
  conciergeTitle: string;
  conciergeBody: string;
  mapLinkLabel: string;
  operator: OperatorInfo;
  ratingsBig: string;
  ratingsTag: string;
  ratingsSub: string;
  ratingBars: RatingBar[];
  reviews: Review[];
  similarHeading: string;
  similarSub: string;
  similarLinkLabel: string;
  similar: SimilarCar[];
  minDays: number;
  booking: BookingTimes;
  protectionPlans: ProtectionPlan[];
  deposit: { label: string; amount: string };
  freeIncluded: string[];
  reserveLabel: string;
  reserveDoneLabel: string;
  trustSignals: TrustSignal[];
  cancellationNote: string;
  contractNote: string;
  paymentNote: string;
}