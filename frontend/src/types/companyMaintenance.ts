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

export type { MaintenanceCategory, MaintenanceDispatchStatus, MaintenanceEventDto, MaintenanceVehicleOption };