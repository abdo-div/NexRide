import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const resolveTenant = catchAsync(async (req, res, next) => {
  const host = req.headers.host; // e.g., "albaraka.nexride.com" or "localhost:5000"

  if (!host) return next();

  // Extract the first part of the domain
  const hostParts = host.split(".");

  // Skip tenant extraction for main domain, api, or direct IP accesses
  // Example: nexride.com, www.nexride.com, api.nexride.com, localhost:5000
  if (
    hostParts.length < 3 ||
    ["www", "api", "admin", "localhost"].includes(hostParts[0].toLowerCase())
  ) {
    return next();
  }

  const subdomain = hostParts[0].toLowerCase();

  // Search DB for company matching subdomain
  const company = await Company.findOne({ subdomain, active: true });

  if (!company) {
    return next(
      new AppError("Rental company domain not found or deactivated.", 404)
    );
  }

  // Inject company details directly into the Request object
  req.tenant = company;
  req.tenantId = company._id;

  next();
});