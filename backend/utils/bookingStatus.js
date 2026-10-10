/**
 * Single source of truth for which booking statuses occupy a vehicle's dates.
 *
 * Previously each call site carried its own hardcoded list, and they drifted:
 * the booking-creation collision check and the two availability checks all had
 * to be edited independently. Omitting `PENDING_PAYMENT` from the creation
 * check let a second customer book the same vehicle for the same dates while
 * the first customer was still in checkout.
 *
 * `PENDING_PAYMENT` DOES reserve dates: the row is written before the customer
 * reaches the payment gateway, so those dates are spoken for. The reservation
 * is released by `services/bookingExpiry.service.js`, which flips stale
 * pending bookings to `EXPIRED`; `EXPIRED` is therefore deliberately absent
 * from this list.
 *
 * `COMPLETED` is also absent on purpose - a completed rental is in the past
 * and must not block future dates.
 */
export const DATE_BLOCKING_BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "ACTIVE",
];

/**
 * Half-open date-range overlap: an existing booking conflicts when it starts
 * before the requested range ends AND ends after the requested range starts.
 * Using a strict comparison on both sides means a rental that ends at 10:00
 * does not collide with one that starts at 10:00 the same day.
 */
export const buildDateOverlapFilter = (startDate, endDate) => [
  { startDate: { $lt: endDate }, endDate: { $gt: startDate } },
];
