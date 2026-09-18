import type { VehicleCategory } from "../types/category";

export const CATEGORIES_DATA: VehicleCategory[] = [
  {
    id: "economy",
    badge: "5.8L / 100km",
    availableCount: 40,
    iconName: "car",
    title: "ECONOMY",
    description:
      "Kia Cerato, Hyundai Elantra, Toyota Corolla for city transit.",
    startingPrice: 120,
    currency: "LYD/day",
  },
  {
    id: "executive-suv",
    badge: "Full 4WD Equipped",
    availableCount: 28,
    iconName: "car",
    title: "EXECUTIVE SUV",
    description:
      "Range Rover Velar, BMW X5, Mercedes GLE with prestige comfort.",
    startingPrice: 450,
    currency: "LYD/day",
  },
  {
    id: "ultra-luxury",
    badge: "VIP Diplomatic Ready",
    availableCount: 14,
    iconName: "star",
    title: "ULTRA LUXURY",
    description:
      "Mercedes-Maybach, G63 AMG, S-Class with optional security escort.",
    startingPrice: 850,
    currency: "LYD/day",
  },
  {
    id: "desert-4x4",
    badge: "SaharaTrail Certified",
    availableCount: 32,
    iconName: "mountain",
    title: "DESERT 4x4",
    description:
      "Land Cruiser 300 VXR, Nissan Patrol, Hilux GR auxiliary fuel equipped.",
    startingPrice: 400,
    currency: "LYD/day",
  },
  {
    id: "electric-hybrid",
    badge: "Clean Motion",
    availableCount: 18,
    iconName: "zap",
    title: "ELECTRIC & HYBRID",
    description:
      "Porsche Taycan, Camry Hybrid, Lexus ES for silent luxury touring.",
    startingPrice: 320,
    currency: "LYD/day",
  },
];
