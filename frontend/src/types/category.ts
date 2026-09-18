export interface VehicleCategory {
  id: string;
  badge: string;
  availableCount: number;
  iconName: "car" | "star" | "mountain" | "zap";
  title: string;
  description: string;
  startingPrice: number;
  currency: string;
}
