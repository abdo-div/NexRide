import type { Vehicle } from "../types/vehicle";

export const LOCATION_OPTIONS = [
  { id: "mji", label: "Tripoli - Mitiga Airport (MJI)", count: 38 },
  { id: "downtown", label: "Tripoli Downtown / Hai Al-Andalus", count: 46 },
  { id: "benina", label: "Benghazi - Benina Airport (BEN)", count: 19 },
  { id: "misrata", label: "Misrata Commercial Free Zone", count: 14 },
];

export const BODY_PROFILES = [
  { id: "suv", label: "SUVs", count: 25 },
  { id: "coupe", label: "Coupe", count: 12 },
  { id: "sedan", label: "Sedans", count: 22 },
  { id: "offroad", label: "4x4 Offroad", count: 16 },
];

export const DRIVETRAIN_OPTIONS = [
  { id: "auto", label: "Automatic Transmission", count: 72 },
  { id: "manual", label: "Manual Transmission", count: 12 },
  { id: "octane", label: "Petrol High-Octane", count: 68 },
];

export const CERTIFIED_FLEETS = [
  { id: "star", name: "Star Rentals Libya", rating: "4.9" },
  { id: "apex", name: "Apex Prestige Tripoli", rating: "5.0" },
  { id: "safwa", name: "Al-Safwa Executive", rating: "4.9" },
  { id: "sahary", name: "Sahary Fleet Co.", rating: "4.8" },
];

export const PERK_OPTIONS = [
  { id: "instant", label: "Instant Confirmation" },
  { id: "airport", label: "Airport VIP Terminal Drop-off" },
  { id: "zero", label: "Zero Cash Deposit Option" },
];

export const SEGMENTS = [
  { id: "luxury", label: "Luxury SUVs" },
  { id: "sports", label: "Sports & Coupe" },
  { id: "offroad", label: "4x4 Desert" },
  { id: "economy", label: "Economy" },
];

export const PRICE_MIN = 100;
export const PRICE_MAX = 2500;
export const DEFAULT_MAX_PRICE = 2200;

const op = (
  id: string,
  name: string,
  initials: string,
  rating: number,
  reviewsCount: number,
): Vehicle["operator"] => ({ id, name, initials, rating, reviewsCount, isVerified: true });

const STAR = op("star", "Star Rentals Libya", "SR", 4.9, 124);
const APEX = op("apex", "Apex Prestige Tripoli & Benghazi", "AP", 5.0, 89);
const SAHARY = op("sahary", "Sahary Fleet Co.", "SF", 4.8, 210);
const SAFWA = op("safwa", "Al-Safwa Executive Fleet", "AS", 4.9, 165);
const MADINA = op("madina", "Madina Auto Tripoli", "MA", 4.7, 92);

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "g63-magno",
    title: "Mercedes-AMG G63 Magno Black",
    category: "Luxury SUV · Armored Ready",
    segment: "luxury",
    pricePerDay: 1200,
    totalForPeriod: 6000,
    periodDays: 5,
    image:
      "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&q=80&w=1000",
    location: "mji",
    body: "suv",
    drive: "auto",
    operatorId: "star",
    operator: STAR,
    isInstantConfirmation: true,
    isTopPick: true,
    airportVip: true,
    specs: {
      engine: "4.0L V8 Bi-T",
      seats: "5 Seats",
      gearbox: "9G-Tronic",
      fuel: "Petrol 98",
    },
    perks: [
      "Complimentary Mitiga Terminal VIP delivery",
      "Unlimited mileage across greater Tripoli & Zawiya",
    ],
  },
  {
    id: "porsche-gt3",
    title: "Porsche 911 GT3 (992 Gen)",
    category: "Supercar · Circuit Spec",
    segment: "sports",
    pricePerDay: 1850,
    totalForPeriod: 9250,
    periodDays: 5,
    image:
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1000",
    location: "downtown",
    body: "coupe",
    drive: "auto",
    operatorId: "apex",
    operator: APEX,
    badgeTag: "Prestige Exclusive",
    badgeTagSecondary: "PDK 7-Speed",
    specs: {
      engine: "502 HP 4.0L",
      seats: "2 Seats",
      gearbox: "RWD + Aero",
      fuel: "Tier-1 Full",
    },
    perks: [
      "Chauffeur escort option available on request",
      "Clean handover inspection report signed via app",
    ],
  },
  {
    id: "land-cruiser-300",
    title: "Toyota Land Cruiser 300 VXR 2024",
    category: "Institutional 4WD · Desert Proven",
    segment: "offroad",
    pricePerDay: 650,
    totalForPeriod: 3250,
    periodDays: 5,
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1000",
    location: "benina",
    body: "offroad",
    drive: "auto",
    operatorId: "sahary",
    operator: SAHARY,
    badgeTag: "Sahara Heavy-Duty Ready",
    zeroDeposit: true,
    specs: {
      engine: "Twin-Turbo V6",
      seats: "7 Passengers",
      gearbox: "Full 4WD Multi",
      fuel: "Diesel Twin",
    },
    perks: [
      "GPS satellite telematics tracker enabled for desert routes",
      "Intercity cross-governorate permit",
    ],
  },
  {
    id: "range-rover-sport",
    title: "Range Rover Sport Autobiography",
    category: "Luxury Flagship · Chauffeur Ready",
    segment: "luxury",
    pricePerDay: 1100,
    totalForPeriod: 5500,
    periodDays: 5,
    image:
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=1000",
    location: "mji",
    body: "suv",
    drive: "auto",
    operatorId: "safwa",
    operator: SAFWA,
    airportVip: true,
    badgeTag: "Diplomatic & Executive",
    specs: {
      engine: "3.0L MHEV",
      seats: "5 Executive",
      gearbox: "8-Speed Auto",
      fuel: "Hybrid Petrol",
    },
    perks: [
      "Complimentary security checkpoint clearance kit",
      "Full sanitization seal & bottle cooler loaded",
    ],
  },
  {
    id: "hyundai-tucson",
    title: "Hyundai Tucson Ultimate 2024",
    category: "City Cruiser · Value Class",
    segment: "economy",
    pricePerDay: 240,
    totalForPeriod: 1200,
    periodDays: 5,
    image:
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1000",
    location: "misrata",
    body: "sedan",
    drive: "auto",
    operatorId: "madina",
    operator: MADINA,
    badgeTag: "Urban Efficiency",
    zeroDeposit: true,
    specs: {
      engine: "2.0L Smartstream",
      seats: "5 Seats",
      gearbox: "6-Speed Auto",
      fuel: "Petrol",
    },
    perks: [
      "Ideal for coastal highway & downtown meetings",
      "Zero security deposit on local corporate cards",
    ],
  },
];