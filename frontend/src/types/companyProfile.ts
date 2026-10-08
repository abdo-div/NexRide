import type { VehicleTransmission, VehicleType } from "./vehicle";

/** Fleet card used by the public company profile (/companies/:id). */
export interface CompanyProfileVehicle {
  id: string;
  title: string;
  year: number;
  type: VehicleType;
  typeLabel: string;
  transmission: VehicleTransmission;
  fuelType: string;
  seats: number;
  doors: number;
  dailyPrice: number;
  image: string;
  rating: number;
  reviewsCount: number;
  href: string;
  pickupLocation: string;
}

/** A real Review document pulled from the operator's vehicles (GET /vehicles/:id). */
export interface CompanyProfileReview {
  id: string;
  rating: number;
  review: string;
  author: string | null;
  createdAt?: string;
  vehicleTitle: string;
}

export interface StarCount {
  star: number;
  count: number;
}