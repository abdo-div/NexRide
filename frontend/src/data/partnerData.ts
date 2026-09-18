import type { PartnerMetric, LiveBookingFeedItem } from "../types/partner";

export const PARTNER_METRICS: PartnerMetric[] = [
  {
    id: "online-bookings",
    title: "100% Online Bookings",
    subtitle: "Fleet Control & real-time GPS dispatch",
    variant: "blue",
  },
  {
    id: "fleet-control",
    title: "Automated Fleet Control",
    subtitle: "Guaranteed digital escrow protection",
    variant: "cyan",
  },
  {
    id: "payouts",
    title: "Direct Payouts in LYD",
    subtitle: "Instant weekly bank transfers in LYD",
    variant: "amber",
  },
];

export const LIVE_BOOKING_FEED: LiveBookingFeedItem[] = [
  {
    id: "1",
    location: "Tripoli MJI",
    vehicleName: "G63 AMG Magno",
    amount: "1,200 LYD",
  },
  {
    id: "2",
    location: "Benghazi BEN",
    vehicleName: "Land Cruiser 300",
    amount: "3,250 LYD",
  },
];
