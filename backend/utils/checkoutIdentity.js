import { createHash } from "node:crypto";

export const checkoutFingerprint = (body) => createHash("sha256").update(JSON.stringify({
  vehicleId: String(body.vehicleId),
  startDate: new Date(body.startDate).toISOString(),
  endDate: new Date(body.endDate).toISOString(),
  pickupLocation: body.pickupLocation || null,
  paymentMethod: body.paymentMethod || null,
  addonIds: [...new Set(body.addonIds || [])].sort(),
  primaryDriver: body.primaryDriver ? {
    firstName: body.primaryDriver.firstName,
    lastName: body.primaryDriver.lastName,
    email: body.primaryDriver.email,
    phone: body.primaryDriver.phone,
    eligibilityConfirmed: body.primaryDriver.eligibilityConfirmed,
  } : null,
})).digest("hex");
