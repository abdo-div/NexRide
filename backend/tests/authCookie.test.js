import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "test-only-auth-cookie-secret-that-is-long-enough";
process.env.JWT_EXPIRES_IN = "90d";

const { createSendToken, logout } = await import(
  "../controllers/authController.js"
);

const responseDouble = () => {
  const state = { cookie: null, statusCode: null, body: null };
  const response = {
    cookie(name, value, options) {
      state.cookie = { name, value, options };
      return response;
    },
    status(statusCode) {
      state.statusCode = statusCode;
      return response;
    },
    json(body) {
      state.body = body;
      return response;
    },
  };
  return { response, state };
};

test("authentication exposes the JWT only through a hardened HTTP-only cookie", () => {
  const user = {
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    name: "Cookie User",
    password: "should-not-be-returned",
  };
  const { response, state } = responseDouble();

  createSendToken(user, 200, { secure: false, headers: {} }, response);

  assert.equal(state.statusCode, 200);
  assert.equal(Object.hasOwn(state.body, "token"), false);
  assert.equal(state.body.data.user.password, undefined);
  assert.equal(state.cookie.name, "jwt");
  assert.ok(state.cookie.value);
  assert.equal(state.cookie.options.httpOnly, true);
  assert.equal(state.cookie.options.sameSite, "lax");
  assert.equal(state.cookie.options.secure, false);
  assert.equal(state.cookie.options.path, "/");
  assert.ok(state.cookie.options.expires instanceof Date);
});

test("TLS requests issue secure session cookies", () => {
  const { response, state } = responseDouble();

  createSendToken(
    { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", password: "secret" },
    201,
    { secure: true, headers: {} },
    response,
  );

  assert.equal(state.cookie.options.secure, true);
});

test("production sessions support credentialed requests from a separate frontend origin", (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  t.after(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  const { response, state } = responseDouble();
  createSendToken(
    { _id: "cccccccccccccccccccccccc", password: "secret" },
    200,
    { secure: false, headers: {} },
    response,
  );

  assert.equal(state.cookie.options.secure, true);
  assert.equal(state.cookie.options.sameSite, "none");
});

test("logout expires the cookie with the same security attributes", () => {
  const { response, state } = responseDouble();

  logout(
    { secure: false, headers: { "x-forwarded-proto": "https" } },
    response,
  );

  assert.equal(state.body.status, "success");
  assert.equal(state.cookie.value, "loggedout");
  assert.equal(state.cookie.options.httpOnly, true);
  assert.equal(state.cookie.options.sameSite, "lax");
  assert.equal(state.cookie.options.secure, true);
  assert.equal(state.cookie.options.path, "/");
  assert.equal(state.cookie.options.expires.getTime(), 0);
});
