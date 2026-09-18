export interface RegionHub {
  id: string;
  badge: string;
  code: string;
  cityName: string;
  subtitle: string;
  vehiclesAvailable: number;
  features: string[];
}

export interface RegionFeature {
  id: string;
  iconType: "sos" | "gps" | "shield";
  title: string;
  description: string;
}
