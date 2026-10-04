import type {
  BookingCompanyRef,
  MaintenanceDispatchStatus,
  MaintenanceEventDto,
  MaintenancePriority,
  MaintenanceCategory,
  MaintenanceVehicleRef,
} from "../types/admin";

/** Populated vehicle from a maintenance event (may be a plain id). */
export const vehicleOf = (event: MaintenanceEventDto): MaintenanceVehicleRef | null =>
  typeof event.vehicleId === "object" ? event.vehicleId : null;

/** Populated partner from a maintenance event (may be a plain id). */
export const companyOf = (event: MaintenanceEventDto): BookingCompanyRef | null =>
  typeof event.companyId === "object" ? event.companyId : null;

/** Deterministic registry reference shown in place of a plate/VIN. */
export const eventVehicleRef = (event: MaintenanceEventDto): string =>
  vehicleOf(event)?._id
    ? `#VR-${(vehicleOf(event)?._id ?? "").slice(-6).toUpperCase()}`
    : `#VR-${(event.vehicleId ?? "").toString().slice(-6).toUpperCase()}`;

export const eventCodeOf = (event: MaintenanceEventDto): string =>
  `MNT-${event._id.slice(-6).toUpperCase()}`;

const CATEGORY_SHORT: Record<MaintenanceCategory, string> = {
  ROUTINE_SERVICE: "SRV",
  OIL_FILTER: "OIL",
  TIRES: "TRS",
  BRAKES: "BRK",
  DIAGNOSTICS: "DIAG",
  BALLISTIC_ARMOR: "BAL",
  DETAILING: "DFL",
  OTHER: "MNT",
};

/** Deterministic dispatch-lock code rendered on the quarantine banner. */
export const dispatchLockCodeOf = (event: MaintenanceEventDto): string => {
  const suffix = eventCodeOf(event)
    .slice(-3)
    .replace("MNT-", "");
  return `DISPATCH-LOCK-${CATEGORY_SHORT[event.category]}-${suffix}`;
};

export const isLocked = (status: MaintenanceDispatchStatus): boolean =>
  status !== "COMPLETED";

export const priorityOptions: MaintenancePriority[] = [
  "CRITICAL",
  "HIGH",
  "ROUTINE",
];

export const categoryOptions: MaintenanceCategory[] = [
  "ROUTINE_SERVICE",
  "OIL_FILTER",
  "TIRES",
  "BRAKES",
  "DIAGNOSTICS",
  "BALLISTIC_ARMOR",
  "DETAILING",
  "OTHER",
];