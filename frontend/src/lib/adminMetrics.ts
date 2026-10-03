import type {
  BookingCompanyRef,
  BookingDto,
} from "../types/booking";
import type { VehicleDto } from "../types/vehicle";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
  AdminOverviewData,
} from "../types/admin";

// -----------------------------------------------------------------------------
// Period handling
// -----------------------------------------------------------------------------

export type DashboardPeriod = "today" | "7d" | "30d";
export type ActivePeriod = DashboardPeriod | "custom";

export interface CustomWindow {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (inclusive)
}

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const parseDay = (value: string): Date => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const periodWindow = (
  period: ActivePeriod,
  custom?: CustomWindow,
): { from: Date; to: Date } => {
  const now = new Date();
  if (period === "custom" && custom?.from) {
    return { from: startOfDay(parseDay(custom.from)), to: endOfDay(parseDay(custom.to)) };
  }
  const from = startOfDay(now);
  if (period === "today") return { from, to: now };
  const days = period === "7d" ? 6 : 29;
  from.setDate(from.getDate() - days);
  return { from, to: now };
};

const inWindow = (iso: string | null | undefined, from: Date, to: Date): boolean => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

/** Percentage change, or null when there is no prior baseline to compare against. */
const deltaPercent = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

// -----------------------------------------------------------------------------
// Hub filter (the dispatch-hub selector in the admin header)
// -----------------------------------------------------------------------------

export const filterByHub = (
  data: AdminOverviewData,
  hub: string,
): AdminOverviewData => {
  if (!hub) return data;
  const matchCompany = (company: BookingCompanyRef | null): boolean =>
    Boolean(company && company.city === hub);
  return {
    ...data,
    bookings: data.bookings.filter(
      (b) =>
        matchCompany(typeof b.companyId === "object" ? b.companyId : null) ||
        b.pickupLocation.toLocaleLowerCase().includes(hub.toLocaleLowerCase()),
    ),
    vehicles: data.vehicles.filter((v) => v.city === hub),
    companies: data.companies.filter((c) => c.city === hub),
    payments: data.payments,
  };
};

// -----------------------------------------------------------------------------
// KPI metrics
// -----------------------------------------------------------------------------

export interface OverviewMetrics {
  totalVehicles: number;
  availableFleet: number;
  maintenanceCount: number;
  activeRentals: number;
  utilizationPct: number;
  periodBookings: number;
  confirmedInPeriod: number;
  activeInPeriod: number;
  bookingDelta: number | null;
  revenueGross: number;
  revenueNet: number;
  revenueDelta: number | null;
  pendingPayouts: number;
  payoutPartners: number;
  pendingCompanies: number;
}

const ACTIVE = "ACTIVE";
const CONFIRMED = "CONFIRMED";

export const buildMetrics = (
  data: AdminOverviewData,
  period: ActivePeriod,
  custom?: CustomWindow,
): OverviewMetrics => {
  const { from, to } = periodWindow(period, custom);
  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  const prevTo = new Date(from.getTime());

  const periodBookings = data.bookings.filter((b) => inWindow(b.createdAt, from, to));
  const previousBookings = data.bookings.filter((b) => inWindow(b.createdAt, prevFrom, prevTo));

  const completed = data.payments.filter(
    (p) => p.status === "COMPLETED" && inWindow(p.paidAt ?? p.createdAt, from, to),
  );
  const previousCompleted = data.payments.filter(
    (p) =>
      p.status === "COMPLETED" &&
      inWindow(p.paidAt ?? p.createdAt, prevFrom, prevTo),
  );
  const gross = completed.reduce((sum, p) => sum + p.amount, 0);
  const previousGross = previousCompleted.reduce((sum, p) => sum + p.amount, 0);
  const unsettled = data.payments.filter((p) => p.payoutStatus === "UNSETTLED");
  const partners = new Set(
    unsettled.map((p) => (typeof p.companyId === "string" ? p.companyId : p.companyId?._id)).filter(Boolean),
  );

  const totalVehicles = data.vehicles.length;
  const activeRentals = data.bookings.filter(
    (b) => b.bookingStatus === ACTIVE,
  ).length;

  return {
    totalVehicles,
    availableFleet: data.vehicles.filter(
      (v) => v.operationalStatus === "AVAILABLE" && v.listingStatus === "PUBLISHED",
    ).length,
    maintenanceCount: data.vehicles.filter(
      (v) => v.operationalStatus === "MAINTENANCE",
    ).length,
    activeRentals,
    utilizationPct:
      totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0,
    periodBookings: periodBookings.length,
    confirmedInPeriod: periodBookings.filter(
      (b) => b.bookingStatus === CONFIRMED || b.bookingStatus === ACTIVE,
    ).length,
    activeInPeriod: periodBookings.filter((b) => b.bookingStatus === ACTIVE)
      .length,
    bookingDelta: deltaPercent(periodBookings.length, previousBookings.length),
    revenueGross: gross,
    revenueNet: completed.reduce((sum, p) => sum + p.commissionAmount, 0),
    revenueDelta: deltaPercent(gross, previousGross),
    pendingPayouts: unsettled.reduce((sum, p) => sum + p.companyShare, 0),
    payoutPartners: partners.size,
    pendingCompanies: data.companies.filter((c) => c.status === "PENDING").length,
  };
};

// -----------------------------------------------------------------------------
// Dispatch chart series (bookings volume / revenue over the active window)
// -----------------------------------------------------------------------------

export interface ChartPoint {
  label: string;
  showLabel: boolean;
  count: number;
  revenue: number;
}

export interface ChartSeries {
  points: ChartPoint[];
  maxCount: number;
  maxRevenue: number;
}

const dayKey = (iso: string, from: Date): number => {
  const d = startOfDay(new Date(iso));
  return Math.floor((d.getTime() - from.getTime()) / 86400000);
};

export const buildChartSeries = (
  data: AdminOverviewData,
  period: ActivePeriod,
  lang: string,
  custom?: CustomWindow,
): ChartSeries => {
  const { from, to } = periodWindow(period, custom);
  const pointCount = Math.max(
    1,
    period === "today"
      ? 24
      : Math.round((to.getTime() - from.getTime()) / 86400000),
  );
  const points: ChartPoint[] = [];

  const isToday = period === "today";
  const bucketIndex = (iso: string): number => {
    if (!iso) return -1;
    const t = new Date(iso).getTime();
    if (t < from.getTime() || t > to.getTime()) return -1;
    if (isToday) return new Date(iso).getHours();
    return dayKey(iso, from);
  };

  for (let i = 0; i < pointCount; i += 1) {
    points.push({
      label: "",
      showLabel: false,
      count: 0,
      revenue: 0,
    });
  }

  data.bookings.forEach((b) => {
    const idx = bucketIndex(b.createdAt);
    if (idx >= 0 && idx < pointCount) points[idx].count += 1;
  });

  data.payments.forEach((p) => {
    if (p.status !== "COMPLETED") return;
    const idx = bucketIndex(p.paidAt || p.createdAt || "");
    if (idx >= 0 && idx < pointCount) points[idx].revenue += p.amount;
  });

  const fmt = new Intl.DateTimeFormat(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const labelStep = isToday ? 4 : pointCount > 24 ? 5 : 1;
  points.forEach((point, i) => {
    if (i % labelStep !== 0) return;
    if (isToday) {
      point.label = `${String(i).padStart(2, "0")}:00`;
    } else {
      const day = new Date(from.getTime() + i * 86400000);
      point.label = pointCount > 24 ? day.toLocaleDateString(lang, { day: "numeric", month: "short" }) : fmt.format(day);
    }
    point.showLabel = true;
  });

  const maxCount = Math.max(0, ...points.map((p) => p.count));
  const maxRevenue = Math.max(0, ...points.map((p) => p.revenue));

  return { points, maxCount: niceCeiling(maxCount), maxRevenue: niceCeiling(maxRevenue) };
};

/** Rounds a value up to a chart-friendly axis ceiling (1,2,5 × 10^n). */
export const niceCeiling = (value: number): number => {
  if (value <= 0) return 0;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

// -----------------------------------------------------------------------------
// Real-time operations feed
// -----------------------------------------------------------------------------

export interface FeedItem {
  id: string;
  kind: "approval" | "vehicle" | "maintenance";
  title: string;
  detail: string;
  meta: string;
  time: Date;
}

export const buildFeed = (
  companies: AdminCompanyDto[],
  vehicles: VehicleDto[],
): FeedItem[] => {
  const items: FeedItem[] = [];

  companies.forEach((company) => {
    if (company.status !== "PENDING") return;
    items.push({
      id: `approval-${company._id}`,
      kind: "approval",
      title: company.name,
      detail: `${company.subdomain ?? company.slug ?? ""} • ${company.phone ?? ""}`.trim().replace(/^•\s*/, ""),
      meta: company.city,
      time: new Date(company.createdAt ?? Date.now()),
    });
  });

  vehicles
    .filter((v) => v.operationalStatus === "MAINTENANCE")
    .forEach((v) => {
      items.push({
        id: `maintenance-${v._id}`,
        kind: "maintenance",
        title: `${v.make} ${v.model}`,
        detail: `${v.year ?? ""} ${v.type ?? ""}`.trim(),
        meta: v.city ?? v.pickupLocation ?? "",
        time: new Date(v.createdAt ?? Date.now()),
      });
    });

  const recent = [...vehicles]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
    .slice(0, 2);
  recent.forEach((v) => {
    items.push({
      id: `vehicle-${v._id}`,
      kind: "vehicle",
      title: `${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}`,
      detail: `${v.transmission ?? ""} • ${v.fuelType ?? ""}`.trim().replace(/^•\s*/, ""),
      meta: typeof v.companyId === "object" ? v.companyId?.name ?? "" : "",
      time: new Date(v.createdAt ?? Date.now()),
    });
  });

  return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 4);
};

// -----------------------------------------------------------------------------
// CSV export (real filtered data, never mocked)
// -----------------------------------------------------------------------------

const escapeCsv = (value: string | number): string =>
  `"${String(value).replaceAll('"', '""')}"`;

export const bookingsCsv = (bookings: BookingDto[]): string => {
  const header = [
    "Ref",
    "Vehicle",
    "Customer",
    "Company",
    "Pickup Location",
    "Start",
    "End",
    "Total (LYD)",
    "Booking Status",
    "Payment Status",
  ];
  const rows = bookings.map((b) => [
    b._id,
    `${typeof b.vehicleId === "object" ? `${b.vehicleId.make ?? ""} ${b.vehicleId.model ?? ""}` : ""} ${typeof b.vehicleId === "object" ? b.vehicleId.year ?? "" : ""}`.trim(),
    typeof b.customerId === "object" ? b.customerId.name ?? "" : "",
    typeof b.companyId === "object" ? b.companyId.name ?? "" : "",
    b.pickupLocation,
    b.startDate,
    b.endDate,
    b.totalAmount,
    b.bookingStatus,
    b.paymentStatus,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
};

/** CSV export of the real registered fleet (used by the Fleet & Vehicles page). */
export const fleetCsv = (vehicles: VehicleDto[]): string => {
  const header = [
    "Make",
    "Model",
    "Year",
    "Class",
    "Operational Status",
    "Listing Status",
    "City",
    "Branch",
    "Daily Rate (LYD)",
    "Transmission",
    "Fuel",
    "Seats",
    "Doors",
    "Partner",
    "Partner City",
  ];
  const rows = vehicles.map((v) => [
    v.make,
    v.model,
    v.year,
    v.type,
    v.operationalStatus,
    v.listingStatus,
    v.city,
    v.pickupLocation,
    v.dailyPrice,
    v.transmission,
    v.fuelType,
    v.seats,
    v.doors,
    typeof v.companyId === "object" ? v.companyId?.name ?? "" : "",
    typeof v.companyId === "object" ? v.companyId?.city ?? "" : "",
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
};

/** CSV export of the real registered operators (used by the Companies page). */
export const companiesCsv = (
  companies: AdminCompanyDto[],
  vehicles: VehicleDto[],
): string => {
  const fleetByCompany = new Map<string, number>();
  vehicles.forEach((v) => {
    const id =
      typeof v.companyId === "object" ? v.companyId?._id ?? "" : v.companyId ?? "";
    fleetByCompany.set(id, (fleetByCompany.get(id) ?? 0) + 1);
  });
  const header = [
    "Company",
    "Status",
    "City",
    "Address",
    "Email",
    "Phone",
    "Storefront",
    "Fleet Size",
    "Commission Rate (%)",
    "Registered",
  ];
  const rows = companies.map((c) => [
    c.name,
    c.status,
    c.city,
    c.address ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.subdomain ?? c.slug ?? "",
    fleetByCompany.get(c._id) ?? 0,
    c.customCommissionRate ?? "",
    c.createdAt ?? "",
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
};

/**
 * CSV export of the real registered renter accounts, enriched with derived
 * activity: booking counts and lifetime spend from the booking/payment ledgers.
 */
export const customersCsv = (
  customers: AdminCustomerDto[],
  bookings: BookingDto[],
  payments: AdminPaymentDto[],
): string => {
  const countBy = (list: BookingDto[]): Map<string, number> => {
    const map = new Map<string, number>();
    list.forEach((b) => {
      const id =
        typeof b.customerId === "object" ? b.customerId?._id ?? "" : (b.customerId ?? "");
      map.set(id, (map.get(id) ?? 0) + 1);
    });
    return map;
  };
  const bookCounts = countBy(bookings);
  const activeBookings = bookings.filter((b) =>
    (["PAID", "CONFIRMED", "ACTIVE"] as readonly string[]).includes(b.bookingStatus),
  );
  const activeCounts = countBy(activeBookings);
  const spendBy = new Map<string, number>();
  payments
    .filter((p) => p.status === "COMPLETED")
    .forEach((p) => {
      const id =
        typeof p.customerId === "object"
          ? p.customerId?._id ?? ""
          : (p.customerId ?? "");
      spendBy.set(id, (spendBy.get(id) ?? 0) + p.amount);
    });

  const header = [
    "Name",
    "Email",
    "Phone",
    "Account Status",
    "Total Bookings",
    "Active Bookings",
    "Lifetime Spend (LYD)",
    "Channels",
    "Registered",
  ];
  const rows = customers.map((c) => [
    c.name,
    c.email,
    c.phoneNumber ?? "",
    c.status ?? "ACTIVE",
    bookCounts.get(c._id) ?? 0,
    activeCounts.get(c._id) ?? 0,
    Math.round(spendBy.get(c._id) ?? 0),
    channelsLabel(payments, c),
    c.createdAt ?? "",
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
};

/**
 * CSV export of the real payment ledger, enriched by joining the unpopulated
 * refs against the renter registry, bookings and fleet companies.
 */
export const paymentsCsv = (
  payments: AdminPaymentDto[],
  bookings: BookingDto[],
  customers: AdminCustomerDto[],
  companies: AdminCompanyDto[],
): string => {
  const idOf = (value: unknown): string =>
    typeof value === "object" && value
      ? (value as { _id?: string })._id ?? ""
      : ((value ?? "") as string);
  const customerOf = (payment: AdminPaymentDto): AdminCustomerDto | undefined =>
    customers.find((c) => c._id === idOf(payment.customerId));
  const companyOf = (payment: AdminPaymentDto): AdminCompanyDto | undefined =>
    companies.find((c) => c._id === idOf(payment.companyId));
  const bookingOf = (payment: AdminPaymentDto): BookingDto | undefined =>
    bookings.find((b) => b._id === idOf(payment.bookingId));

  const header = [
    "Transaction Ref",
    "Merchant Reference",
    "Transaction ID",
    "Booking Ref",
    "Vehicle",
    "Customer",
    "Customer Email",
    "Company",
    "Method",
    "Gateway",
    "Currency",
    "Amount",
    "Commission",
    "Commission Rate (%)",
    "Company Share",
    "Status",
    "Payout Status",
    "Paid At",
    "Created",
  ];
  const rows = payments.map((p) => {
    const booking = bookingOf(p);
    const vehicle =
      typeof booking?.vehicleId === "object"
        ? `${booking.vehicleId.make ?? ""} ${booking.vehicleId.model ?? ""}`.trim()
        : "";
    const customer = customerOf(p);
    const company = companyOf(p);
    return [
      `#TRX-${p._id.slice(-6).toUpperCase()}`,
      p.merchantReference ?? "",
      p.transactionId ?? "",
      booking ? `#NX-${booking._id.slice(-6).toUpperCase()}` : "",
      vehicle,
      customer?.name ?? "",
      customer?.email ?? "",
      company?.name ?? "",
      p.paymentMethod ?? "",
      p.paymentGateway ?? "",
      p.currency ?? "LYD",
      p.amount,
      p.commissionAmount,
      p.commissionRate,
      p.companyShare,
      p.status,
      p.payoutStatus,
      p.paidAt ?? "",
      p.createdAt ?? "",
    ];
  });
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
};

const channelsLabel = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): string => {
  const seen = new Set<string>();
  payments
    .filter((p) => {
      const id =
        typeof p.customerId === "object"
          ? p.customerId?._id ?? ""
          : (p.customerId ?? "");
      return id === customer._id && p.status === "COMPLETED";
    })
    .forEach((p) => {
      if (p.paymentMethod) seen.add(p.paymentMethod);
    });
  return Array.from(seen).join(" ");
};