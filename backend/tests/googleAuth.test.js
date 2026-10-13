import assert from "node:assert/strict";
import { test } from "node:test";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User_model.js";
import { googleLoginSchema } from "../validations/auth.validation.js";

process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

const { authenticateGoogleUser } = await import("../services/authService.js");

const verifiedPayload = {
  sub: "google-subject-123",
  email: "Person@Example.com",
  email_verified: true,
  name: "Google Person",
};

test("Google login validation requires an ID token", () => {
  assert.throws(() => googleLoginSchema.parse({ body: {} }));
  assert.equal(
    googleLoginSchema.parse({ body: { idToken: " credential " } }).body.idToken,
    "credential",
  );
});

test("verified Google users are created as customers without fake credentials", async (t) => {
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async ({ audience }) => {
    assert.equal(audience, process.env.GOOGLE_CLIENT_ID);
    return { getPayload: () => verifiedPayload };
  });
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  t.mock.method(User, "create", async (data) => ({
    ...data,
    status: "ACTIVE",
  }));

  const user = await authenticateGoogleUser("valid-id-token");

  assert.equal(user.email, "person@example.com");
  assert.equal(user.role, "customer");
  assert.equal(user.googleId, verifiedPayload.sub);
  assert.equal(user.password, undefined);
  assert.equal(user.phoneNumber, undefined);
});

test("a matching local account is linked without replacing its role or password", async (t) => {
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
    getPayload: () => verifiedPayload,
  }));
  const existingUser = {
    email: "person@example.com",
    role: "admin",
    status: "ACTIVE",
    password: "existing-password-hash",
    googleId: undefined,
    saveCalled: false,
    async save() {
      this.saveCalled = true;
    },
  };
  t.mock.method(User, "findOne", () => ({ select: async () => existingUser }));

  const user = await authenticateGoogleUser("valid-id-token");

  assert.equal(user.googleId, verifiedPayload.sub);
  assert.equal(user.role, "admin");
  assert.equal(user.password, "existing-password-hash");
  assert.equal(user.saveCalled, true);
});

test("Google login rejects an unverified email", async (t) => {
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
    getPayload: () => ({ ...verifiedPayload, email_verified: false }),
  }));

  await assert.rejects(
    authenticateGoogleUser("unverified-id-token"),
    (error) => error.statusCode === 401,
  );
});

test("missing Google configuration disables only the Google login flow", async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  try {
    await assert.rejects(
      authenticateGoogleUser("credential"),
      (error) => error.statusCode === 503,
    );
  } finally {
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;
  }
});
