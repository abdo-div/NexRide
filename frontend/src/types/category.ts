export interface VehicleCategory {
  id: string;
  badge: string;
  availableCount: number;
  iconName: "car" | "star" | "mountain" | "zap";
  title: string;
  description: string;
  /** Lowest live daily rate in the bucket; null when no vehicle matches. */
  startingPrice: number | null;
  currency: string;
}
