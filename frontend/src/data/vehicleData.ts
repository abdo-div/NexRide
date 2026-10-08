// The sidebar location filter must match the database `city` field verbatim,
// so option ids are the real city strings (Tripoli, Benghazi, ...) rather than
// hand-written hub ids. Live counts are derived from the fetched vehicles.
export const LOCATION_OPTIONS = [
  { id: "Tripoli", label: "fleet.filters.locations.tripoli" },
  { id: "Benghazi", label: "fleet.filters.locations.benghazi" },
  { id: "Misrata", label: "fleet.filters.locations.misrata" },
  { id: "Sabha", label: "fleet.filters.locations.sabha" },
  { id: "Zawiya", label: "fleet.filters.locations.zawiya" },
  { id: "Tobruk", label: "fleet.filters.locations.tobruk" },
  { id: "Al Khums", label: "fleet.filters.locations.alKhums" },
];

export const BODY_PROFILES = [
  { id: "suv", label: "fleet.filters.bodies.suv", count: 25 },
  { id: "coupe", label: "fleet.filters.bodies.coupe", count: 12 },
  { id: "sedan", label: "fleet.filters.bodies.sedan", count: 22 },
  { id: "offroad", label: "fleet.filters.bodies.offroad", count: 16 },
];

export const DRIVETRAIN_OPTIONS = [
  { id: "auto", label: "fleet.filters.drivetrains.automatic", count: 72 },
  { id: "manual", label: "fleet.filters.drivetrains.manual", count: 12 },
  { id: "octane", label: "fleet.filters.drivetrains.highOctane", count: 68 },
];

export const CERTIFIED_FLEETS = [
  { id: "star", name: "Star Rentals Libya", rating: "4.9" },
  { id: "apex", name: "Apex Prestige Tripoli", rating: "5.0" },
  { id: "safwa", name: "Al-Safwa Executive", rating: "4.9" },
  { id: "sahary", name: "Sahary Fleet Co.", rating: "4.8" },
];

export const PERK_OPTIONS = [
  { id: "instant", label: "fleet.filters.perks.instantConfirmation" },
  { id: "airport", label: "fleet.filters.perks.airportVip" },
  { id: "zero", label: "fleet.filters.perks.zeroDeposit" },
];

export const SEGMENTS = [
  { id: "luxury", label: "home.trending.categories.luxurySUV" },
  { id: "sports", label: "home.trending.categories.sportsCoupe" },
  { id: "offroad", label: "home.trending.categories.desert4x4" },
  { id: "economy", label: "data.categories.economy.title" },
];

export const PRICE_MIN = 100;
export const PRICE_MAX = 2500;
export const DEFAULT_MAX_PRICE = 2200;