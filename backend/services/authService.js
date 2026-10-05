import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";
import { getJwtSecret } from "../config/jwt.js";
import { resolveClientUrl } from "../config/clientUrl.js";

/**
 * Sign JWT Token
 */
export const signToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Resolves the base URL of the client application so emails link back to the
 * SPA instead of the API.
 *
 * Reads FRONTEND_URL exclusively. The previous signature accepted the request's
 * host and protocol and used them as a fallback, which made every reset link
 * forgeable via a `Host` header. The host arguments are no longer accepted so a
 * future caller cannot reintroduce the fallback by passing them along.
 */

/**
 * Reduces a phone number to its local Libyan digits (no country code, no
 * leading zero, no separators) so "+218 91 234 5678", "00218912345678",
 * "0912345678" and "912345678" all collapse to "912345678".
 */
const localPhoneDigits = (value) => {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^(?:00)?218/, "").replace(/^0+/, "");
};

/**
 * Canonical storage format for phone numbers: +218XXXXXXXXX
 */
export const normalisePhoneNumber = (value) => {
  const local = localPhoneDigits(value);
  return local ? `+218${local}` : "";
};

/**
 * Builds a Mongo query matching an account by email address OR phone number so
 * both the sign-in and account-recovery screens can accept either one. Phone
 * matching is format-tolerant because historical records were seeded with
 * several different conventions.
 */
const identifierQuery = (identifier) => {
  const raw = typeof identifier === "string" ? identifier.trim() : "";
  if (!raw) return { _id: null };

  const lower = raw.toLowerCase();
  if (lower.includes("@")) return { email: lower };

  const digits = raw.replace(/\D/g, "");
  const local = localPhoneDigits(raw);
  const phoneCandidates = new Set(
    [
      raw,
      digits,
      local,
      `+${digits}`,
      `00${digits}`,
      `+${local}`,
      `+218${local}`,
      `00${local}`,
      `0${local}`,
    ].filter(Boolean),
  );

  return {
    $or: [
      { email: lower },
      { phoneNumber: { $in: [...phoneCandidates] } },
    ],
  };
};

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    passwordConfirm: userData.passwordConfirm,
    phoneNumber: normalisePhoneNumber(userData.phoneNumber),
    role: "customer",
  });

  // Non-blocking welcome email dispatch
  const dashboardURL = resolveClientUrl();
  new Email(newUser, dashboardURL).sendWelcome().catch((err) => {
    console.error("Non-critical background welcome email error:", err.message);
  });

  return newUser;
};

/**
 * Authenticate user credentials
 */
export const authenticateUser = async (identifier, password) => {
  if (!identifier || !password) {
    throw new AppError("Please provide email and password!", 400);
  }

  const user = await User.findOne(identifierQuery(identifier)).select(
    "+password"
  );

  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  return user;
};

/**
 * Initiate forgot password lifecycle & email reset link
 */
export const requestPasswordReset = async (identifier) => {
  const user = await User.findOne(identifierQuery(identifier));

  if (!user) {
    throw new AppError("There is no user with that email address", 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${resolveClientUrl()}/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    return true;
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new AppError(
      "There was an error sending the email. Try again later!",
      500
    );
  }
};

/**
 * Reset user password with token
 */
export const resetUserPasswordWithToken = async (token, newPassword, newPasswordConfirm) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return user;
};

/**
 * Update authenticated user password
 */
export const updateAuthenticatedUserPassword = async (
  userId,
  passwordCurrent,
  password,
  passwordConfirm
) => {
  const user = await User.findById(userId).select("+password");

  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    throw new AppError("Your current password is wrong", 401);
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  return user;
};