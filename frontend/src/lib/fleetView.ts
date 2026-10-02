import type { BookingDto } from "../types/booking";
import type { VehicleCompanyRef, VehicleDto } from "../types/vehicle";
import { referenceCodeFrom } from "./bookingView";

/**
 * Booking statuses that hold a vehicle against a real reservation window
 * (payment-secured or in-progress trips). PENDING_PAYMENT and EXPIRED are
 * excluded: they neither block a vehicle nor represent an assignment.
 */
export const RESERVED_BOOKING_STATUSES = ["PAID", "CONFIRMED", "ACTIVE"] as const;

export const vehicleTitle = (v: VehicleDto): string =>
  [v.make, v.model].filter(Boolean).join(" ") || "NexRide Vehicle";

export const vehicleFullTitle = (v: VehicleDto): string => {
  const name = vehicleTitle(v);
  return v.year ? `${name} (${v.year})` : name;
};

export const companyOf = (v: VehicleDto): VehicleCompanyRef | null =>
  typeof v.companyId === "object" && v.companyId?.name ? v.companyId : null;

export const matchesVehicle = (booking: BookingDto, vehicleId: string): boolean =>
  typeof booking.vehicleId === "object"
    ? booking.vehicleId._id === vehicleId
    : booking.vehicleId === vehicleId;

export const bookingsFor = (
  bookings: BookingDto[],
  v: VehicleDto,
): BookingDto[] => bookings.filter((b) => matchesVehicle(b, v._id));

const byStartAsc = (a: BookingDto, b: BookingDto): number =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

const byCreatedDesc = (a: BookingDto, b: BookingDto): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/**
 * The reservation currently holding this vehicle (soonest start first), or
 * null when it is free for staging.
 */
export const stagingBooking = (
  bookings: BookingDto[],
  v: VehicleDto,
): BookingDto | undefined =>
  bookingsFor(bookings, v)
    .filter((b) =>
      (RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus),
    )
    .sort(byStartAsc)[0];

/** Most recent booking attached to the vehicle (used by the dossier shortcut). */
export const latestBooking = (
  bookings: BookingDto[],
  v: VehicleDto,
): BookingDto | undefined =>
  [...bookingsFor(bookings, v)].sort(byCreatedDesc)[0];

/** Net operator earnings on this vehicle: the partner share of completed trips. */
export const earnedFor = (bookings: BookingDto[], v: VehicleDto): number =>
  bookingsFor(bookings, v)
    .filter((b) => b.bookingStatus === "COMPLETED")
    .reduce((sum, b) => sum + b.companyShare, 0);

export const customerName = (booking: BookingDto): string =>
  typeof booking.customerId === "object" ? booking.customerId.name ?? "" : "";

export const fleetRef = (v: VehicleDto): string =>
  referenceCodeFrom(v._id);