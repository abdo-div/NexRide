export interface PartnerMetric {
  id: string;
  title: string;
  subtitle: string;
  variant?: "blue" | "cyan" | "amber";
}

export interface LiveBookingFeedItem {
  id: string;
  location: string;
  vehicleName: string;
  amount: string;
}
