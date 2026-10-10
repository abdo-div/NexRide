import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";

const USER_SEARCH_FIELDS = ["name", "email", "phoneNumber", "role", "status"];

/**
 * Filter out disallowed fields from req.body
 */
export const filterAllowedFields = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

/**
 * Fetch all users with optional filtering (platform-admin register).
 *
 * Previously this loaded the entire collection into memory, so the admin
 * customer register grew without bound. It now runs a real server-side page
 * (skip/limit pushed to MongoDB) plus a matching count, and returns pagination
 * metadata. Schema filters such as `role`/`status` keep working unchanged;
 * `page`/`limit`/`sort`/`search`/`fields` are now reserved query controls
 * consistent with every other list endpoint.
 */
export const fetchAllUsers = async (query = {}) => {
  const { docs, pagination } = await runPaginatedQuery(User, {}, query, {
    searchFields: USER_SEARCH_FIELDS,
  });

  return { users: docs, pagination };
};

/**
 * Fetch a single user by ID
 */
export const fetchUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("No user found with that ID", 404);
  }
  return user;
};

/**
 * Update current logged-in user profile details
 */
export const updateCurrentUserProfile = async (userId, filteredBody) => {
  const updatedUser = await User.findByIdAndUpdate(userId, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new AppError("No user found with that ID", 404);
  }

  return updatedUser;
};

/**
 * Soft-delete current logged-in user (self-deactivation)
 */
export const softDeleteCurrentUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { active: false });
  return null;
};

/**
 * Administrative update of user details
 */
export const updateUserByAdmin = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError("No user found with that ID", 404);
  }

  return user;
};

/**
 * Administrative account status toggle (ACTIVE, SUSPENDED, BANNED)
 */
export const updateUserAccountStatus = async (userId, status) => {
  const validStatuses = ["ACTIVE", "SUSPENDED", "BANNED"];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    throw new AppError("Invalid status value provided", 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { status: status.toUpperCase() },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError("No user found with that ID", 404);
  }

  return user;
};

/**
 * Administrative hard delete / permanent account purge
 */
export const deleteUserByAdmin = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError("No user found with that ID", 404);
  }

  return null;
};