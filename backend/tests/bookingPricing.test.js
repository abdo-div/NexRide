import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateBookingExtras,
  MUNICIPAL_FEE_LYD,
} from "../utils/bookingPricing.js";

test("checkout add-ons are priced from the server catalogue", () => {
  const pricing = calculateBookingExtras(["insurance", "driver"], 3);

  assert.equal(pricing.addonsTotal, 210);
  assert.deepEqual(
    pricing.addons.map(({ id, quantity, amount }) => ({ id, quantity, amount })),
    [
      { id: "insurance", quantity: 3, amount: 135 },
      { id: "driver", quantity: 3, amount: 75 },
    ],
  );
  assert.equal(369 + pricing.addonsTotal + MUNICIPAL_FEE_LYD, 604);
});

test("duplicate add-on ids cannot be charged twice", () => {
  const pricing = calculateBookingExtras(["childseat", "childseat"], 5);
  assert.equal(pricing.addonsTotal, 20);
  assert.equal(pricing.addons.length, 1);
});
