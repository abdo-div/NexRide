import type { PartnerMetric, LiveBookingFeedItem } from "../types/partner";

export const PARTNER_METRICS: PartnerMetric[] = [
  {
    id: "online-bookings",
    title: "data.partnerMetrics.onlineBookings.title",
    subtitle: "data.partnerMetrics.onlineBookings.subtitle",
    variant: "blue",
  },
  {
    id: "fleet-control",
    title: "data.partnerMetrics.fleetControl.title",
    subtitle: "data.partnerMetrics.fleetControl.subtitle",
    variant: "cyan",
  },
  {
    id: "payouts",
    title: "data.partnerMetrics.payouts.title",
    subtitle: "data.partnerMetrics.payouts.subtitle",
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
