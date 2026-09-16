import jwt from "jsonwebtoken";
import { promisify } from "util";
import mongoose from "mongoose";
import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

/**
 * 1. PROTECT: Authenticates JWT token and populates user & tenant context
 */
export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET || "fallback-super-secret-key-change-this",
  );

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401),
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  req.user = currentUser;
  req.tenantId = currentUser.company ? currentUser.company.toString() : null;

  // If tenantId is not yet set but user is a company owner, resolve company
  if (!req.tenantId && currentUser.role === "company") {
    const ownedCompany = await mongoose
      .model("Company")
      .findOne({ ownerId: currentUser._id });
    if (ownedCompany) {
      req.tenantId = ownedCompany._id.toString();
      req.user.company = ownedCompany._id;
    }
  }

  res.locals.user = currentUser;

  next();
});

/**
 * 2. RESTRICT TO: Role-Based Access Control (RBAC)
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    next();
  };
};

/**
 * 3. IS LOGGED IN: Soft check for template rendering
 */
export const isLoggedIn = async (req, res, next) => {
  if (req.cookies && req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET || "fallback-super-secret-key-change-this",
      );
      const currentUser = await User.findById(decoded.id);

      if (!currentUser || currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/**
 * 4. VERIFY TENANT ACCESS: Prevents cross-tenant data leaks
 */
export const verifyTenantAccess = (modelName, tenantKey = "companyId") => {
  return catchAsync(async (req, res, next) => {
    if (req.user.role === "admin") return next();

    const resourceId =
      req.params.id || req.params[`${modelName.toLowerCase()}Id`];
    if (!resourceId) {
      return next(
        new AppError("Resource identifier missing from parameters.", 400),
      );
    }

    const Model = mongoose.model(modelName);
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return next(new AppError(`${modelName} resource not found.`, 404));
    }

    // Allow customers to access their own bookings/payments (handles populated customerId)
    if (req.user.role === "customer") {
      const customerVal = resource.customerId || resource.customer;
      const customerIdStr = customerVal?._id
        ? customerVal._id.toString()
        : customerVal
        ? customerVal.toString()
        : null;

      if (customerIdStr && customerIdStr === req.user.id.toString()) {
        req.resource = resource;
        return next();
      }
    }

    // Extract company ID from resource (handles populated object or raw ObjectId)
    const companyVal = resource[tenantKey];
    const resourceCompanyId = companyVal?._id
      ? companyVal._id.toString()
      : companyVal
      ? companyVal.toString()
      : null;

    // Resolve user's company tenant ID
    let userTenantId =
      req.tenantId || (req.user?.company ? req.user.company.toString() : null);
    if (!userTenantId && req.user?.id) {
      const ownedCompany = await mongoose
        .model("Company")
        .findOne({ ownerId: req.user.id });
      if (ownedCompany) {
        userTenantId = ownedCompany._id.toString();
        req.tenantId = userTenantId;
        req.user.company = ownedCompany._id;
      }
    }

    if (!userTenantId || resourceCompanyId !== userTenantId) {
      return next(
        new AppError(
          "Access Denied. You do not own this tenant resource.",
          403,
        ),
      );
    }

    req.resource = resource;
    next();
  });
};
