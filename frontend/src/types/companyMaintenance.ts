import type {
  MaintenanceCategory,
  MaintenanceDispatchStatus,
  MaintenanceEventDto,
  MaintenanceVehicleOption,
} from "./admin";
import type { PaginationMeta } from "./admin";

export type CompanyMaintenanceStatusFilter = MaintenanceDispatchStatus | "ALL";
export type CompanyMaintenanceCategoryFilter = MaintenanceCategory | "ALL";

/** Client-side filter state that maps to GET /companies/maintenance. */
export interface CompanyMaintenanceQuery {
  search: string;
  status: CompanyMaintenanceStatusFilter;
  category: CompanyMaintenanceCategoryFilter;
  page: number;
  limit: number;
}

/** Full payload of the tenant-scoped maintenance endpoint. */
export interface CompanyMaintenanceData {
  events: MaintenanceEventDto[];
  pagination: PaginationMeta;
}

export type VehicleHealthStatus = "CRITICAL_OVERDUE" | "DUE_SOON" | "HEALTHY";

export interface MaintenanceFleetVehicle {
  _id: string;
  make: string;
  model: string;
  year?: number;
  plateNumber?: string;
  vin?: string;
  photos?: string[];
  operationalStatus: string;
  currentOdometer: number;
  licenseExpiryDate?: string | null;
  insuranceExpiryDate?: string | null;
  healthStatus: VehicleHealthStatus;
  nextServiceMilestone: {
    currentKm: number;
    targetKm: number;
    percentageUsed: number;
    kmRemaining: number;
  };
  paperworkStatus: { licenseDays: number | null; insuranceDays: number | null };
}

export interface MaintenanceFleetQuery {
  search: string;
  healthStatus: VehicleHealthStatus | "ALL";
  page: number;
  limit: number;
}

export type { MaintenanceCategory, MaintenanceDispatchStatus, MaintenanceEventDto, MaintenanceVehicleOption };
