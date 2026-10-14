import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

// Opt-in: use only an isolated, seeded QA API. This creates accounts and rentals.
const base = process.env.TEST_API_BASE_URL;
test("real reservation API: pricing, retry recovery, isolation, concurrency and cancellation", { skip: !base }, async (t) => {
  const request = async (path, token, method = "GET", body, key) => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { "Idempotency-Key": key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const login = async (identifier) => {
    const res = await request("/users/login", null, "POST", { identifier, password: process.env.TEST_QA_PASSWORD });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.token;
  };
  const token = await login(process.env.TEST_QA_EMAIL);
  const operator = await login(process.env.TEST_OPERATOR_EMAIL);
  const password = "Local-Regression!2026";
  const signup = await request("/users/signup", null, "POST", { name: "Isolated Regression QA", email: `qa-${randomUUID()}@example.com`, phoneNumber: "+218910000003", password, passwordConfirm: password });
  assert.equal(signup.status, 201, JSON.stringify(signup.body));
  const other = signup.body.token;
  const fleet = await request("/vehicles");
  const vehicleId = fleet.body.data.vehicles[0]._id;
  const dailyPrice = fleet.body.data.vehicles[0].dailyPrice;
  const start = Date.now() + 90 * 86400000;
  const payload = { vehicleId, startDate: new Date(start).toISOString(), endDate: new Date(start + 86400000 + 60000).toISOString(), paymentMethod: "CASH_ON_DELIVERY", primaryDriver: { firstName: "QA", lastName: "Driver", email: "qa@example.com", phone: "+218910000001", eligibilityConfirmed: true }, addonIds: ["insurance", "driver", "childseat", "delivery"] };
  const created = [];
  t.after(async () => {
    for (const id of created) await request(`/bookings/${id}/cancel`, token, "PATCH");
    await request("/users/deleteMe", other, "DELETE");
  });
  await t.test("invalid dates, add-ons, identity and anonymous checkout are rejected", async () => {
    assert.equal((await request("/bookings", null, "POST", payload)).status, 401);
    for (const changes of [{ startDate: "2020-01-01T12:00:00Z" }, { endDate: payload.startDate }, { addonIds: ["unknown"] }, { primaryDriver: { ...payload.primaryDriver, eligibilityConfirmed: false } }]) {
      assert.equal((await request("/bookings", token, "POST", { ...payload, ...changes })).status, 400);
    }
  });
  const key = randomUUID();
  const first = await request("/bookings", token, "POST", payload, key);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const booking = first.body.data.booking;
  const payment = first.body.data.payment;
  created.push(booking._id);
  await t.test("partial day rounds up, extras and fee are charged once; client price is ignored", async () => {
    assert.equal(booking.totalDays, 2);
    assert.equal(booking.addonsTotal, 210);
    assert.equal(booking.municipalFee, 25);
    assert.equal(booking.totalAmount, dailyPrice * 2 + 235);
    assert.equal(payment.amount, booking.totalAmount);
    assert.equal(payment.status, "PENDING");
    assert.equal(booking.startDate, payload.startDate);
    assert.equal(booking.primaryDriver.phone, payload.primaryDriver.phone);
  });
  await t.test("lost response retries return the same booking and payment without Redis", async () => {
    const retry = await request("/bookings", token, "POST", { ...payload, totalAmount: 1, discountAmount: 9999 }, key);
    assert.equal(retry.status, 201, JSON.stringify(retry.body));
    assert.equal(retry.body.data.booking._id, booking._id);
    assert.equal(retry.body.data.payment._id, payment._id);
    assert.equal(retry.body.data.booking.totalAmount, booking.totalAmount);
    assert.equal((await request("/bookings", token, "POST", { ...payload, addonIds: [] }, key)).status, 409);
    assert.equal((await request("/bookings", null, "POST", payload, key)).status, 401);
    assert.equal((await request("/bookings", other, "POST", payload, key)).status, 409);
  });
  await t.test("other customers cannot read, cancel, invoice or collect this booking", async () => {
    for (const path of [`/bookings/${booking._id}`, `/bookings/${booking._id}/invoice`, `/payments/${payment._id}`, `/payments/${payment._id}/invoice`]) assert.equal((await request(path, other)).status, 403);
    assert.equal((await request(`/bookings/${booking._id}/cancel`, other, "PATCH")).status, 403);
    assert.equal((await request(`/payments/${payment._id}/collect-cash`, token, "PATCH")).status, 403);
  });
  await t.test("overlap is blocked; exact return boundary is available", async () => {
    const check = async (s, e) => (await request("/bookings/check-availability?" + new URLSearchParams({ vehicleId, startDate: s, endDate: e }))).body.data.isAvailable;
    assert.equal(await check(payload.startDate, payload.endDate), false);
    assert.equal(await check(payload.endDate, new Date(start + 3 * 86400000).toISOString()), true);
    assert.equal((await request("/bookings", token, "POST", payload)).status, 409);
  });
  await t.test("cancel retires pending cash and releases dates; collection then fails", async () => {
    assert.equal((await request(`/bookings/${booking._id}/cancel`, token, "PATCH")).status, 200);
    const ledger = await request(`/payments/${payment._id}`, token);
    assert.equal(ledger.body.data.payment?.status ?? ledger.body.data.data?.status, "FAILED");
    assert.equal((await request(`/payments/${payment._id}/collect-cash`, operator, "PATCH")).status, 409);
    assert.equal((await request(`/bookings/${booking._id}/cancel`, token, "PATCH")).status, 400);
  });
  await t.test("simultaneous identical keyed requests recover one booking; different keys cannot double-book", async () => {
    const sameKey = randomUUID();
    const same = await Promise.all([request("/bookings", token, "POST", payload, sameKey), request("/bookings", token, "POST", payload, sameKey)]);
    same.forEach((res) => assert.equal(res.status, 201, JSON.stringify(res.body)));
    assert.equal(same[0].body.data.booking._id, same[1].body.data.booking._id);
    const id = same[0].body.data.booking._id;
    created.push(id);
    await request(`/bookings/${id}/cancel`, token, "PATCH");
    const race = await Promise.all([request("/bookings", token, "POST", payload, randomUUID()), request("/bookings", token, "POST", payload, randomUUID())]);
    assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
    created.push(race.find((r) => r.status === 201).body.data.booking._id);
  });
  await t.test("operator cash collection confirms once; cancellation records the full QA refund", async () => {
    const res = await request("/bookings", token, "POST", { ...payload, startDate: new Date(start + 4 * 86400000).toISOString(), endDate: new Date(start + 5 * 86400000).toISOString() }, randomUUID());
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const { booking: b, payment: p } = res.body.data;
    created.push(b._id);
    assert.equal((await request(`/bookings/${b._id}/status`, operator, "PATCH", { status: "CONFIRMED" })).status, 400);
    const collected = await request(`/payments/${p._id}/collect-cash`, operator, "PATCH");
    assert.equal(collected.status, 200, JSON.stringify(collected.body));
    assert.equal(collected.body.data.booking.paymentStatus, "PAID");
    assert.equal(collected.body.data.booking.bookingStatus, "CONFIRMED");
    assert.equal((await request(`/payments/${p._id}/collect-cash`, operator, "PATCH")).status, 409);
    const cancelled = await request(`/bookings/${b._id}/cancel`, token, "PATCH");
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.data.booking.paymentStatus, "REFUNDED");
    const ledger = await request(`/payments/${p._id}`, token);
    assert.equal(ledger.body.data.payment.status, "REFUNDED");
    assert.equal(ledger.body.data.payment.refundAmount, p.amount);
  });
});
