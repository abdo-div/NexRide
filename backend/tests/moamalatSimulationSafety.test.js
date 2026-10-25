import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("presentation payment simulation is restricted to test mode and audited", () => {
  const controller = readSource("../controllers/moamalatController.js");
  const model = readSource("../models/payment_model.js");

  assert.match(controller, /moamalatConfig\.env !== "test"/);
  assert.match(controller, /bookingCustomerId\?\.toString\(\) !== customerId\.toString\(\)/);
  assert.match(controller, /booking\.bookingStatus !== "PENDING_PAYMENT"/);
  assert.match(controller, /booking\.paymentStatus !== "UNPAID"/);
  assert.match(controller, /isSimulated: true/);
  assert.match(model, /isSimulated:\s*\{[\s\S]*?default: false/);
});

test("presentation payment simulation requires an authenticated customer", () => {
  const routes = readSource("../routes/moamalatRoutes.js");
  const simulationRoute = routes.slice(routes.indexOf('"/simulate"'));

  assert.match(simulationRoute, /protect,[\s\S]*?restrictTo\("customer"\)/);
  assert.match(simulationRoute, /validate\(initiatePaymentSchema\)/);
  assert.match(simulationRoute, /simulateTestPayment/);
});
