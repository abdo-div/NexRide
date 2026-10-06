import type { PaginationMeta } from "./admin";

/** Fleet display states — one bucket per vehicle (sums to the fleet total). */
export type CompanyFleetDisplayState =
  | "available"
  | "rented"
  | "maintenance"
  | "draft";

export type CompanyVehicleType =
  | "SEDAN"
  | "SUV"
  | "HATCHBACK"
  | "LUXURY"
  | "VAN"
  | "PICKUP";

export type CompanyFleetCategory = "all" | "sedan" | "suv" | "luxury" | "commercial";
export type CompanyFleetTransmission = "all" | "automatic" | "manual";
export type CompanyFleetFuel = "all" | "petrol" | "hybrid" | "diesel" | "electric";

export interface CompanyFleetCompany {
  id: string;
  name: string;
  city: string | null;
  code: string | null;
}

/** Fleet-posture deck (fleet-wide, unaffected by list filters). */
export interface CompanyFleetSummary {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  draft: number;
}

export interface CompanyFleetVehicle {
  id: string;
  code: string;
  make: string;
  model: string;
  year: number | null;
  type: CompanyVehicleType | null;
  displayStatus: CompanyFleetDisplayState;
  bookings: number;
  dailyPrice: number;
  weeklyPrice: number | null;
  city: string | null;
  pickupLocation: string | null;
  transmission: "MANUAL" | "AUTOMATIC" | null;
  fuelType: "GASOLINE" | "DIESEL" | "ELECTRIC" | "HYBRID" | null;
  rating: { average: number | null; count: number };
  gpsActive: boolean;
  photo: string | null;
}

/** Full payload of GET /companies/fleet. */
export interface CompanyFleetData {
  period: { from: string | null; to: string | null };
  company: CompanyFleetCompany | null;
  summary: CompanyFleetSummary;
  list: CompanyFleetVehicle[];
  pagination: PaginationMeta;
}

/** Client-side filter state that maps to the backend query string. */
export interface CompanyFleetQuery {
  search: string;
  status: CompanyFleetDisplayState | "all";
  category: CompanyFleetCategory;
  transmission: CompanyFleetTransmission;
  fuel: CompanyFleetFuel;
  city: string;
  page: number;
  limit: number;
}

export type CompanyFleetView = "list" | "grid";