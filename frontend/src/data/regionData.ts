import type { RegionHub, RegionFeature } from "../types/region";

export const REGION_HUBS: RegionHub[] = [
  {
    id: "tripoli",
    badge: "Capital Hub",
    code: "MJI",
    cityName: "TRIPOLI",
    subtitle: "Mitiga MJI Airport & Hai Al-Andalus Marina Hub",
    vehiclesAvailable: 48,
    features: ["VIP Lounge Pickup", "Armored Escort Available"],
  },
  {
    id: "benghazi",
    badge: "Eastern Hub",
    code: "BEN",
    cityName: "BENGHAZI",
    subtitle: "Benina BEN Airport & Downtown Commercial Hub",
    vehiclesAvailable: 24,
    features: ["Direct Hotel Delivery", "Corporate Accounts"],
  },
  {
    id: "misrata",
    badge: "Trade Corridor",
    code: "MRA",
    cityName: "MISRATA",
    subtitle: "Commercial Free Zone & Port Logistics Hub",
    vehiclesAvailable: 16,
    features: ["Heavy Duty 4x4 & Pickups", "Executive Sedans"],
  },
  {
    id: "sabha",
    badge: "Sahara Gateway",
    code: "SEB",
    cityName: "SABHA",
    subtitle: "Southern Desert Gateway & Exploration Base",
    vehiclesAvailable: 12,
    features: ["Sahara Expedition Prep", "Satellite Telematics"],
  },
];

export const REGION_FEATURES: RegionFeature[] = [
  {
    id: "rescue",
    iconType: "sos",
    title: "24/7 ROADSIDE RESCUE",
    description: "Active fleet patrol across the Libyan Coastal Expressway",
  },
  {
    id: "telematics",
    iconType: "gps",
    title: "GPS TELEMATICS INCLUDED",
    description: "Instant coordinate tracking & remote breakdown assistance",
  },
  {
    id: "clearance",
    iconType: "shield",
    title: "INTER-CITY TRAVEL CLEARANCE",
    description:
      "Pre-cleared digital rental documentation for transit checkpoints",
  },
];
