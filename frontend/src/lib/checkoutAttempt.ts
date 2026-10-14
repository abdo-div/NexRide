import type { CreateBookingPayload } from "./bookingApi";
import type { PrimaryDriver } from "../types/booking";

export const normalizeDriver = (driver: PrimaryDriver): PrimaryDriver => ({
  ...driver,
  firstName: driver.firstName.trim(), lastName: driver.lastName.trim(), email: driver.email.trim(),
  phone: "+218" + driver.phone.replace(/\D/g, "").replace(/^218/, "").replace(/^0/, ""),
});
export const validDriver = (driver: PrimaryDriver): boolean => {
  const d = normalizeDriver(driver);
  return d.firstName.length > 0 && d.firstName.length <= 100 && d.lastName.length > 0 && d.lastName.length <= 100
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) && d.email.length <= 254
    && /^\+2189[1245]\d{7}$/.test(d.phone) && d.eligibilityConfirmed;
};

/** A gateway retry must pay the existing booking; an uncertain POST retries with the same key. */
export const createCheckoutAttempt = <T>(create: (payload: CreateBookingPayload, key: string) => Promise<T>) => {
  const key = crypto.randomUUID();
  let pending: Promise<T> | null = null;
  let originalPayload: CreateBookingPayload | null = null;
  return (payload: CreateBookingPayload): Promise<T> => {
    originalPayload ??= payload;
    pending ??= create(originalPayload, key).catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
};
