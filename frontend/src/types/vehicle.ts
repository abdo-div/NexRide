export interface VehicleSpec {
  engine: string;
  seats: string;
  gearbox: string;
  fuel: string;
}

export interface VehicleOperator {
  id: string;
  name: string;
  initials: string;
  logo?: string;
  rating: number;
  reviewsCount: number;
  isVerified?: boolean;
}

export interface Vehicle {
  id: string;
  title: string;
  category: string;
  vehicleType: VehicleType;
  fuelType: VehicleFuelType;
  segment: string;
  pricePerDay: number;
  totalForPeriod: number;
  periodDays: number;
  image: string;
  location: string;
  body: string;
  drive: string;
  operatorId: string;
  operator: VehicleOperator;
  isInstantConfirmation?: boolean;
  isTopPick?: boolean;
  airportVip?: boolean;
  zeroDeposit?: boolean;
  badgeTag?: string;
  badgeTagSecondary?: string;
  isFavorite?: boolean;
  specs: VehicleSpec;
  perks: string[];
}

// -----------------------------------------------------------------------------
// API contract (GET /api/v1/vehicles) — mirrors backend models/vehicle_model.js
// -----------------------------------------------------------------------------

export type VehicleType =
  | "SEDAN"
  | "SUV"
  | "HATCHBACK"
  | "LUXURY"
  | "VAN"
  | "PICKUP";

export type VehicleTransmission = "MANUAL" | "AUTOMATIC";
export type VehicleFuelType = "GASOLINE" | "DIESEL" | "ELECTRIC" | "HYBRID";
export type VehicleOperationalStatus = "AVAILABLE" | "MAINTENANCE" | "SUSPENDED";
export type VehicleListingStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";

/** Populated subset of the Company document (see services/vehicleService.js). */
export interface VehicleCompanyRef {
  _id: string;
  name: string;
  logo?: string;
  city?: string;
  status?: string;
}

/**
 * Populated review. The backend only ever creates a review for a COMPLETED
 * booking, so a present review is proof of a verified rental.
 */
export interface VehicleReviewDto {
  _id: string;
  rating: number;
  review: string;
  customerId: { _id: string; name?: string; photo?: string } | string | null;
  createdAt?: string;
}

export interface VehicleDto {
  _id: string;
  /** Mongoose virtual; equals _id. */
  id?: string;
  /** Populated company object, or null when the owner was soft-deleted. */
  companyId: VehicleCompanyRef | string | null;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  seats: number;
  doors: number;
  description?: string;
  /** Bare filenames, served from the backend's public/vehicles directory. */
  photos: string[];
  dailyPrice: number;
  weeklyPrice: number | null;
  operationalStatus: VehicleOperationalStatus;
  listingStatus: VehicleListingStatus;
  city: string;
  pickupLocation: string;
  ratingsAverage: number;
  ratingsQuantity: number;
  createdAt?: string;
  updatedAt?: string;
  /** Only present on GET /vehicles/:id. */
  reviews?: VehicleReviewDto[];
}
