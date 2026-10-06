import type { BookingCompanyRef, BookingCustomerRef, BookingDto } from "./booking";
import type { VehicleOperationalStatus, VehicleDto } from "./vehicle";

/** Company document as returned by the admin /companies listing. */
export type CompanyStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

/**
 * Server-side pagination envelope returned by every admin listing endpoint.
 * Mirrors backend/utils/pagination.js `buildPaginationMeta`.
 */
export interface PaginationMeta {
  /** Current page as the server resolved it (never below 1). */
  page: number;
  /** Effective page size after clamping (never above the route maximum). */
  limit: number;
  /** Total records matching the active filters, across every page. */
  total: number;
  /** Number of pages the current limit yields; 0 when there are no rows. */
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Account lifecycle status used by the platform operator for renter accounts.
 * Mirrors the User model enum (ACTIVE | SUSPENDED | BANNED).
 */
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface AdminCustomerDto {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photo?: string;
  role?: string;
  status?: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCompanyDto {
  _id: string;
  ownerId?: string;
  name: string;
  subdomain?: string;
  slug?: string;
  description?: string;
  logo?: string;
  email?: string;
  phone?: string;
  city: string;
  address?: string;
  status: CompanyStatus;
  customCommissionRate?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payment ledger record returned by the admin /commissions listing. The list
 * service does not populate references, so ids arrive as plain ObjectId strings
 * (unlike the single-record endpoint which populates). Keep the union so both
 * shapes type safely.
 */
export type PaymentLedgerStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PayoutStatus = "UNSETTLED" | "PROCESSING" | "SETTLED";

export interface AdminPaymentDto {
  _id: string;
  bookingId?: string | { _id: string };
  customerId:
    | string
    | { _id: string; name?: string; email?: string; phoneNumber?: string }
    | null;
  companyId: string | BookingCompanyRef | null;
  amount: number;
  currency?: string;
  commissionAmount: number;
  commissionRate: number;
  companyShare: number;
  paymentMethod?: string;
  /** Gateway fields surfaced by the ledger service (nullable on the schema). */
  transactionId?: string | null;
  paymentGateway?: string;
  merchantReference?: string;
  status: PaymentLedgerStatus;
  payoutStatus: PayoutStatus;
  paidAt?: string | null;
  payoutSettledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** The raw datasets the admin Overview + Bookings pages render from. */
export interface AdminOverviewData {
  bookings: BookingDto[];
  vehicles: VehicleDto[];
  companies: AdminCompanyDto[];
  payments: AdminPaymentDto[];
}

/**
 * Platform-wide commission & settlement KPIs returned by
 * GET /admin/payouts/summary — aggregated live from the Payment ledger.
 */
export interface AdminPayoutSummary {
  gross: number;
  bookings: number;
  platformTake: number;
  companyEarnings: number;
  effectiveRate: number;
  pendingPayouts: number;
  paidPayouts: number;
  adjustments: number;
  paidRatio: number;
  partnerCount: number;
  activeRuns: number;
}

/** Lifecycle of a fleet operator's settlement run, derived from live totals. */
export type LedgerPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "ADJUSTED"
  | "CLEARED";

/** One clearing-ledger row = one fleet operator's aggregated settlement run. */
export interface AdminPayoutRow {
  companyId?: string | null;
  company?: {
    _id?: string;
    name?: string;
    city?: string;
    status?: CompanyStatus;
    customCommissionRate?: number | null;
  } | null;
  bookings: number;
  gross: number;
  fee: number;
  net: number;
  unsettled: number;
  processing: number;
  settled: number;
  adjustments: number;
  payoutStatus: LedgerPayoutStatus;
  lastPayoutSetAt?: string | null;
  lastPaidAt?: string | null;
}

/** Result of a generated LFB payout-run batch. */
export interface PayoutBatch {
  batchRef: string;
  dispatched: number;
  companies: number;
}

/** Result of approving & dispatching a payout queue. */
export interface PayoutSettleResult {
  settled: number;
}

// ---------------------------------------------------------------------------
// Fleet Maintenance & Quarantine (backend MaintenanceEvent ledger)
// ---------------------------------------------------------------------------

export type MaintenanceCategory =
  | "ROUTINE_SERVICE"
  | "OIL_FILTER"
  | "TIRES"
  | "BRAKES"
  | "DIAGNOSTICS"
  | "BALLISTIC_ARMOR"
  | "DETAILING"
  | "OTHER";

export type MaintenancePriority = "CRITICAL" | "HIGH" | "ROUTINE";

/** Stored lifecycle status. */
export type MaintenanceStoredStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

/**
 * Dispatch status returned by the ledger. OVERDUE is never stored — the backend
 * derives it whenever a pending event has blown past its estimated return.
 */
export type MaintenanceDispatchStatus =
  | MaintenanceStoredStatus
  | "OVERDUE";

/** Populated vehicle subset attached to a maintenance event. */
export interface MaintenanceVehicleRef {
  _id?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: string;
  city?: string;
  pickupLocation?: string;
  operationalStatus?: VehicleOperationalStatus;
  photos?: string[];
  dailyPrice?: number;
  seats?: number;
  companyId?: string | BookingCompanyRef | null;
}

export interface MaintenanceDtcCode {
  code: string;
  description?: string;
}

export interface MaintenanceCostLine {
  label: string;
  amount: number;
}

export interface MaintenanceEventDto {
  _id: string;
  vehicleId: MaintenanceVehicleRef | string;
  companyId?: string | BookingCompanyRef | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStoredStatus;
  dispatchStatus: MaintenanceDispatchStatus;
  triggerReason: string;
  detail?: string;
  workshop?: string;
  technician?: string;
  intakeDate?: string;
  estReturnDate?: string | null;
  completedDate?: string | null;
  estCost: number;
  costLines?: MaintenanceCostLine[];
  dtcCodes?: MaintenanceDtcCode[];
  createdAt?: string;
  updatedAt?: string;
}

/** Fleet Health summary (vehicles + live MaintenanceEvent aggregations). */
export interface MaintenanceSummary {
  totalFleet: number;
  inServiceVehicles: number;
  inServicePct: number;
  scheduledNext7d: number;
  overdueCount: number;
  overdueVehicles: number;
  unavailableFleet: number;
  quarantinedUnits: number;
  mtdCost: number;
  avgCostPerVehicle: number;
  inProgress: number;
  completed14d: number;
  monthLabel: string;
}

/** Minimal vehicle descriptor consumed by maintenance create pickers. */
export interface MaintenanceVehicleOption {
  _id: string;
  make: string;
  model: string;
  year?: number | null;
  city?: string | null;
}

/** Payload for the "+ Log Maintenance Event" action. */
export interface CreateMaintenancePayload {
  vehicleId: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStoredStatus;
  triggerReason: string;
  detail?: string;
  workshop?: string;
  technician?: string;
  intakeDate?: string;
  estReturnDate?: string | null;
  estCost: number;
}

// Re-export populated-ref helpers so admin views can pull object parts safely.
export type { BookingCompanyRef, BookingCustomerRef };

// ---------------------------------------------------------------------------
// Reports & Analytics (live aggregation from GET /admin/reports/summary)
// ---------------------------------------------------------------------------

export type ReportPeriod = "month" | "7d" | "30d" | "3m" | "6m" | "ytd";

export interface ReportPeriodWindow {
  from: string;
  to: string;
  label: ReportPeriod;
}

export interface ReportFleet {
  size: number;
  available: number;
  maintenance: number;
  unavailable: number;
  published: number;
  deployedToday: number;
  utilizationPct: number;
}

export interface ReportPartners {
  total: number;
  approved: number;
  certifiedPct: number;
}

export interface ReportFunnel {
  total: number;
  completed: number;
  activeOnRoad: number;
  cancelled: number;
  pending: number;
  completionPct: number;
  churnPct: number;
  peakDay: { day: string; count: number } | null;
}

export interface ReportFinancial {
  gross: number;
  cut: number;
  net: number;
  takeRate: number;
  avgTicket: number;
  tx: number;
  refunds: { amount: number; tx: number };
}

export interface ReportWeeklyPoint {
  start: string;
  end: string;
  label: string;
  gross: number;
  cut: number;
  tx: number;
}

export interface ReportWeekdayPoint {
  day: string;
  gross: number;
}

export interface ReportClearing {
  settledShare: number;
  pendingShare: number;
  healthPct: number;
  batchRef: string;
}

export interface ReportRenters {
  active: number;
  new: number;
  returning: number;
  retentionPct: number;
  avgSpendPerClient: number;
  ltv: number;
  repeatRenters: number;
  topRenter: { name: string; spend: number; trips: number } | null;
}

export interface ReportComparison {
  grossDeltaPct: number | null;
  cutDeltaPct: number | null;
  bookingsDeltaPct: number | null;
}

export interface ReportTopCompanyRow {
  rank: number;
  _id: string;
  name: string;
  city: string;
  status: string;
  bookings: number;
  gross: number;
  cut: number;
  avgTicket: number;
  completed: number;
  completionPct: number;
  activeNow: number;
}

export interface ReportTopVehicleRow {
  rank: number;
  _id: string;
  vehicle: {
    _id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    transmission?: string;
    fuelType?: string;
    dailyPrice?: number;
    photoUrl?: string | null;
  };
  operator: { _id: string; name: string; city: string };
  bookings: number;
  rentalDays: number;
  revenue: number;
  avgRate: number;
  utilizationPct: number;
}

export interface ReportsSummary {
  period: ReportPeriodWindow;
  fleet: ReportFleet;
  partners: ReportPartners;
  funnel: ReportFunnel;
  financial: ReportFinancial;
  weekly: ReportWeeklyPoint[];
  weekdaySeries: ReportWeekdayPoint[];
  clearing: ReportClearing;
  renters: ReportRenters;
  comparison: ReportComparison;
  topCompanies: ReportTopCompanyRow[];
  topVehicles: ReportTopVehicleRow[];
}

// -----------------------------------------------------------------------------
// Platform Settings & Governance (/admin/settings)
// -----------------------------------------------------------------------------

/** Editable policy groups persisted in the single PlatformSettings document. */
export interface PlatformSettingsGeneral {
  brandName: string;
  tradeEntity: string;
  supportEmail: string;
  hotline: string;
  timezone: string;
  language: "ar" | "en";
}

export interface PlatformSettingsBooking {
  freeCancellationHours: number;
  latePenaltyPct: number;
  escrowReleaseHours: number;
  reservationExpiryMinutes: number;
}

export interface PlatformSettingsCommission {
  standardRatePct: number;
  payoutSchedule: string;
  minPayoutThreshold: number;
  clearingBank: string;
}

export interface PlatformSettingsTelemetry {
  smsDispatchEnabled: boolean;
  maintenanceAlertsEnabled: boolean;
  settlementEscalationEnabled: boolean;
  geofenceEnabled: boolean;
}

export interface PlatformSettingsEmergency {
  bookingFreeze: boolean;
  maintenanceMode: boolean;
}

export interface PlatformSettings {
  general: PlatformSettingsGeneral;
  booking: PlatformSettingsBooking;
  commission: PlatformSettingsCommission;
  telemetry: PlatformSettingsTelemetry;
  emergency: PlatformSettingsEmergency;
  version: number;
  savedBy: string | null;
  updatedAt: string | null;
}

/** Part of a settings patch passed to PATCH /admin/settings. */
export type PlatformSettingsPatch = Partial<{
  general: Partial<PlatformSettingsGeneral>;
  booking: Partial<PlatformSettingsBooking>;
  commission: Partial<PlatformSettingsCommission>;
  telemetry: Partial<PlatformSettingsTelemetry>;
  emergency: Partial<PlatformSettingsEmergency>;
  reset: boolean;
}>;

export interface PlatformGatewayMoamalat {
  enabled: boolean;
  env: string;
  mode: "production" | "sandbox" | "disabled";
  merchantIdMasked: string | null;
  terminalIdMasked: string | null;
}

export interface PlatformGateways {
  moamalat: PlatformGatewayMoamalat;
  sadad: { enabled: boolean };
  tadawul: { enabled: boolean };
}

export interface PlatformGovernanceAdmin {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
}

export interface PlatformGovernanceSession {
  ip: string;
  browser: string;
  userAgent: string;
}

export interface PlatformGovernance {
  fleetSize: number;
  approvedPartners: number;
  partnerTotal: number;
  activeOnRoad: number;
  effectiveTakeRate: number;
  pendingPayouts: number;
  settledPayouts: number;
  admins: PlatformGovernanceAdmin[];
  session: PlatformGovernanceSession;
}

export interface PlatformSettingsRegistry {
  key: string;
  hash: string;
  short: string;
}

export interface PlatformSettingsResponseData {
  settings: PlatformSettings;
  registry: PlatformSettingsRegistry;
  gateways: PlatformGateways;
  governance: PlatformGovernance;
}