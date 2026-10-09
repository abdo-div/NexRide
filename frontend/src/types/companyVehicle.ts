import type { PaginationMeta } from "./admin";
import type {
  CompanyFleetDisplayState,
  CompanyVehicleType,
} from "./companyFleet";

/** Booking-display states mirrored from the trips ledger. */
export type CompanyVehicleTripStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type CompanyVehiclePayment = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

export interface CompanyVehicleCompany {
  id: string;
  name: string;
  city: string | null;
  code: string | null;
}

export interface CompanyVehicleProfile {
  id: string;
  code: string;
  make: string;
  model: string;
  year: number | null;
  type: CompanyVehicleType | null;
  transmission: "MANUAL" | "AUTOMATIC" | null;
  fuelType: "GASOLINE" | "DIESEL" | "ELECTRIC" | "HYBRID" | null;
  seats: number | null;
  doors: number | null;
  dailyPrice: number;
  weeklyPrice: number | null;
  city: string | null;
  pickupLocation: string | null;
  plateNumber?: string | null;
  vin?: string | null;
  odometer?: number | null;
  engine?: string | null;
  drivetrain?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  tankCapacity?: number | null;
  features?: string[];
  monthlyPrice?: number | null;
  depositAmount?: number;
  mileageLimit?: number | null;
  extraMileageFee?: number | null;
  operationalStatus: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
  listingStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED";
  rating: { average: number | null; count: number };
  gpsActive: boolean;
  coordinates: [number, number] | null;
  photo: string | null;
  photos: string[];
  description: string | null;
  createdAt: string | null;
  displayStatus: CompanyFleetDisplayState;
}

export interface CompanyVehicleMetrics {
  bookings: { total: number; completed: number; upcoming: number };
  financial: { revenue: number; trips: number };
  utilization: { pct: number; daysRented: number; windowDays: number };
  rentalDays: number;
  onRoad: boolean;
}

/** One booked/imminent calendar date for the current month. */
export interface CompanyVehicleCalendarDay {
  date: string; // YYYY-MM-DD
  kind: "booked" | "pending";
}

export interface CompanyVehicleCalendar {
  year: number;
  month: number; // 1..12
  label: string;
  bookedDates: CompanyVehicleCalendarDay[];
}

export interface CompanyVehicleNextDispatch {
  id: string;
  reference: string;
  startDate: string;
  endDate: string;
  days: number;
  totalAmount: number;
  customerName: string;
}

export interface CompanyVehicleTrip {
  id: string;
  reference: string;
  customer: { name: string; phone: string | null };
  startDate: string;
  endDate: string;
  days: number;
  channel: string;
  service: { delivery: boolean; label: string };
  totalAmount: number;
  payment: CompanyVehiclePayment;
  bookingStatus: CompanyVehicleTripStatus;
}

/** Full payload of GET /companies/fleet/:vehicleId. */
export interface CompanyVehicleData {
  company: CompanyVehicleCompany | null;
  vehicle: CompanyVehicleProfile;
  metrics: CompanyVehicleMetrics;
  calendar: CompanyVehicleCalendar;
  nextDispatch: CompanyVehicleNextDispatch | null;
  trips: { list: CompanyVehicleTrip[]; pagination: PaginationMeta };
}
