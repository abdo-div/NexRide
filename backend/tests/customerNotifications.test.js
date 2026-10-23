import assert from "node:assert/strict";
import { test } from "node:test";
import Notification from "../models/Notification_model.js";
import notificationRouter from "../routes/notificationRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";
import Email from "../utils/email.js";

const routeHandlers = (path) => {
  const layer = notificationRouter.stack.find((item) => item.route?.path === path);
  assert.ok(layer, `expected notification route ${path}`);
  return layer.route.stack.map((item) => item.handle);
};

test("customer notification routes require authentication and customer role", async () => {
  assert.equal(notificationRouter.stack[0].handle, protect);
  const roleGuard = notificationRouter.stack[1].handle;
  const error = await new Promise((resolve) =>
    roleGuard({ user: { role: "company" } }, {}, resolve),
  );
  assert.equal(error.statusCode, 403);
  assert.ok(routeHandlers("/").length > 0);
  assert.ok(routeHandlers("/read-all").length > 0);
  assert.ok(routeHandlers("/:id/read").length > 1);
});

test("notification schema has an idempotent per-customer dedupe index", () => {
  const index = Notification.schema.indexes().find(
    ([fields]) => fields.userId === 1 && fields.dedupeKey === 1,
  );
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, {
    dedupeKey: { $type: "string" },
  });
});

test("transactional notification email contains the event and booking action", () => {
  const email = new Email(
    { name: "Abdo", email: "abdo@example.com" },
    "https://nexride.example/my-bookings/123",
  );
  const html = email._renderTemplate("customerNotification", {
    title: "Pickup tomorrow",
    message: "Your vehicle is ready at 10:00.",
  });
  assert.match(html, /Pickup tomorrow/);
  assert.match(html, /Your vehicle is ready at 10:00/);
  assert.match(html, /my-bookings\/123/);
});
