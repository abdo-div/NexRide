import type { RegionHub, RegionFeature } from "../types/region";

export const REGION_HUBS: RegionHub[] = [
  {
    id: "tripoli",
    badge: "data.regions.tripoli.badge",
    code: "MJI",
    cityName: "TRIPOLI",
    subtitle: "data.regions.tripoli.subtitle",
    vehiclesAvailable: 48,
    features: [
      "data.regions.tripoli.features.0",
      "data.regions.tripoli.features.1",
    ],
  },
  {
    id: "benghazi",
    badge: "data.regions.benghazi.badge",
    code: "BEN",
    cityName: "BENGHAZI",
    subtitle: "data.regions.benghazi.subtitle",
    vehiclesAvailable: 24,
    features: [
      "data.regions.benghazi.features.0",
      "data.regions.benghazi.features.1",
    ],
  },
  {
    id: "misrata",
    badge: "data.regions.misrata.badge",
    code: "MRA",
    cityName: "MISRATA",
    subtitle: "data.regions.misrata.subtitle",
    vehiclesAvailable: 16,
    features: [
      "data.regions.misrata.features.0",
      "data.regions.misrata.features.1",
    ],
  },
  {
    id: "sabha",
    badge: "data.regions.sabha.badge",
    code: "SEB",
    cityName: "SABHA",
    subtitle: "data.regions.sabha.subtitle",
    vehiclesAvailable: 12,
    features: ["data.regions.sabha.features.0", "data.regions.sabha.features.1"],
  },
];

export const REGION_FEATURES: RegionFeature[] = [
  {
    id: "rescue",
    iconType: "sos",
    title: "data.regionFeatures.rescue.title",
    description: "data.regionFeatures.rescue.description",
  },
  {
    id: "telematics",
    iconType: "gps",
    title: "data.regionFeatures.telematics.title",
    description: "data.regionFeatures.telematics.description",
  },
  {
    id: "clearance",
    iconType: "shield",
    title: "data.regionFeatures.clearance.title",
    description: "data.regionFeatures.clearance.description",
  },
];
