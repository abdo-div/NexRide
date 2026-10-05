import assert from "node:assert/strict";
import { test } from "node:test";
import Email from "../utils/email.js";
import { signupSchema } from "../validations/auth.validation.js";

// FRONTEND_URL is read by the welcome-email path. Without it that path throws,
// so the suite must not depend on a developer's local .env.
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.NODE_ENV ??= "test";
import * as authService from "../services/authService.js";
import User from "../models/User_model.js";

const signupBody = {
  name: "Test Customer",
  email: "customer@example.com",
  phoneNumber: "+218912345678",
  password: "password123",
  passwordConfirm: "password123",
};

test("public signup always creates a customer and strips requested roles", async (t) => {
  const createdUsers = [];
  t.mock.method(User, "create", async (userData) => {
    createdUsers.push(userData);
    return userData;
  });
  t.mock.method(Email.prototype, "sendWelcome", async () => {});

  const normalInput = signupSchema.parse({ body: signupBody });
  assert.equal(normalInput.body.role, undefined);
const normalUser = await authService.registerUser(normalInput.body);
    assert.equal(normalUser.role, "customer");

  for (const role of ["admin", "company", "dispatcher"]) {
    const parsed = signupSchema.parse({
      body: { ...signupBody, email: `${role}@example.com`, role },
    });

    assert.equal(parsed.body.role, undefined);

    const user = await authService.registerUser({ ...parsed.body, role });
    assert.equal(user.role, "customer");
  }

  assert.equal(createdUsers.length, 4);
  assert.ok(createdUsers.every((user) => user.role === "customer"));
});