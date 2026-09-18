import type { TrendingCar } from "../types/trendingCar";

export const TRENDING_CARS_DATA: TrendingCar[] = [
  {
    id: "1",
    companyName: "Star Rentals Libya",
    location: "Tripoli",
    rating: 4.9,
    reviewCount: 74,
    title: "Mercedes-AMG G63 Magno",
    year: 2024,
    image:
      "https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?auto=format&fit=crop&q=80&w=800",
    badges: ["Instant Book", "Zero Deposit"],
    category: "Luxury SUVs",
    specs: [
      { label: "TRANS", value: "Auto 9G" },
      { label: "SEATS", value: "5 Seats" },
      { label: "POWER", value: "577 HP" },
      { label: "DRIVE", value: "AWD" },
    ],
    dailyPrice: 1200,
    currency: "LYD",
  },
  {
    id: "2",
    companyName: "Apex Prestige",
    location: "Tripoli Airport",
    rating: 5.0,
    reviewCount: 42,
    title: "Porsche 911 GT3 (992 Gen)",
    year: 2024,
    image:
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=800",
    badges: ["Circuit Spec", "5.0 Rating"],
    category: "Sports & Coupe",
    specs: [
      { label: "TRANS", value: "PDK 7S" },
      { label: "SEATS", value: "2 Seats" },
      { label: "POWER", value: "502 HP" },
      { label: "DRIVE", value: "RWD" },
    ],
    dailyPrice: 1850,
    currency: "LYD",
  },
  {
    id: "3",
    companyName: "Sahary Fleet Co.",
    location: "Benghazi",
    rating: 4.8,
    reviewCount: 98,
    title: "Toyota Land Cruiser 300",
    year: 2025,
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
    badges: ["Sahara Ready", "Satellite GPS"],
    category: "Desert 4x4",
    specs: [
      { label: "TRANS", value: "10-Speed" },
      { label: "SEATS", value: "7 Seats" },
      { label: "ENGINE", value: "V6 Turbo" },
      { label: "DRIVE", value: "4WD Dual" },
    ],
    dailyPrice: 650,
    currency: "LYD",
  },
];
