import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

/**
 * Sign JWT Token
 */
export const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Register a new user
 */
export const registerUser = async (userData, reqHost, reqProtocol) => {
  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    passwordConfirm: userData.passwordConfirm,
    phoneNumber: userData.phoneNumber,
    role: userData.role || "customer",
  });

  // Non-blocking welcome email dispatch
  const dashboardURL = `${reqProtocol}://${reqHost}/dashboard`;
  new Email(newUser, dashboardURL).sendWelcome().catch((err) => {
    console.error("Non-critical background welcome email error:", err.message);
  });

  return newUser;
};

/**
 * Authenticate user credentials
 */
export const authenticateUser = async (email, password) => {
  if (!email || !password) {
    throw new AppError("Please provide email and password!", 400);
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  return user;
};

/**
 * Initiate forgot password lifecycle & email reset link
 */
export const requestPasswordReset = async (email, host, protocol) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("There is no user with that email address", 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${protocol}://${host}/api/v1/users/resetPassword/${resetToken}`;
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