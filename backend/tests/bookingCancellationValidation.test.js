import test from "node:test";
import assert from "node:assert/strict";

import { cancelBookingSchema } from "../validations/booking.validation.js";

const bookingId = "111111111111111111111111";

test("customer cancellation accepts a request with no reason body", () => {
  const result = cancelBookingSchema.safeParse({
    params: { id: bookingId },
    body: undefined,
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data.body, {});
});

test("customer cancellation still validates an optional reason", () => {
  const result = cancelBookingSchema.safeParse({
    params: { id: bookingId },
    body: { reason: "Travel plans changed" },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.body.reason, "Travel plans changed");
});
