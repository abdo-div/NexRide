import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as companyService from "../services/companyService.js";
import Company from "../models/Company_model.js";
import multer from "multer";
import { saveCompanyLogo } from "../utils/companyImages.js";

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new AppError("Please upload an image file.", 400), false);
  },
});

export const uploadCompanyLogo = logoUpload.single("logo");

export const processCompanyLogo = catchAsync(async (req, _res, next) => {
  if (!req.file) {
    delete req.body.logo;
    return next();
  }
  const companyId = req.tenantId || req.user.company;
  if (!companyId) return next(new AppError("No company profile linked to this user account.", 400));
  const filename = `company-${companyId}-${Date.now()}.webp`;
  req.body.logo = await saveCompanyLogo(req.file.buffer, filename);
  next();
});

export const getAllCompanies = catchAsync(async (req, res, next) => {
  const companies = await companyService.fetchAllCompanies(req.query);

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: { companies },
  });
});

export const getAllAdminCompanies = catchAsync(async (req, res, next) => {
  const { companies, pagination } = await companyService.fetchAllAdminCompanies(
    req.query,
  );

  res.status(200).json({
    status: "success",
    results: companies.length,
    pagination,
    data: { companies },
  });
});

export const getCompanyByStorefrontIdentifier = catchAsync(
  async (req, res, next) => {
    const company = await companyService.fetchCompanyByStorefront(
      req.params.identifier,
    );

    res.status(200).json({
      status: "success",
      data: { company },
    });
  },
);

export const getCompanyById = catchAsync(async (req, res, next) => {
  const company = await companyService.fetchPublicCompanyById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const createCompany = catchAsync(async (req, res, next) => {
  const { name, subdomain, email, phone, city, address, description } = req.body;

  if (!name || !subdomain) {
    return next(new AppError("Please provide both name and subdomain", 400));
  }
  if (!email || !phone || !city || !address) {
    return next(
      new AppError("Please provide email, phone, city, and address", 400)
    );
  }

  const normalizedSubdomain = subdomain.toLowerCase().trim();

  // 1. Check if subdomain is taken
  const existingCompany = await Company.findOne({
    subdomain: normalizedSubdomain,
  });
  if (existingCompany) {
    return next(new AppError("This subdomain is already taken.", 400));
  }

  // 2. Create the company
  const newCompany = await Company.create({
    name,
    subdomain: normalizedSubdomain,
    ownerId: req.user.id,
    email,
    phone,
    city,
    address,
    description,
  });

  // Link company to the creator user profile
  await (await import("../models/User_model.js")).default.findByIdAndUpdate(
    req.user.id,
    {
      company: newCompany._id,
      role: req.user.role === "admin" ? "admin" : "company",
    },
  );
  req.user.company = newCompany._id;
  req.tenantId = newCompany._id.toString();

  res.status(201).json({
    status: "success",
    data: { company: newCompany },
  });
});

export const updateMyCompany = catchAsync(async (req, res, next) => {
  let companyId = req.tenantId || req.user.company;

  if (!companyId && req.user?.id) {
    const ownedCompany = await Company.findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }

  if (!companyId) {
    return next(
      new AppError("No company profile linked to this user account.", 400),
    );
  }

  const updatedCompany = await companyService.updateCompanyProfileByOwner(
    companyId,
    req.body,
  );

  res.status(200).json({
    status: "success",
    data: { company: updatedCompany },
  });
});

/**
 * Resolve the tenant for a company settings request. For a company session the
 * tenant always comes from the session (protect() => req.tenantId), never from
 * the query string, so an operator cannot read another partner's profile.
 * Only an admin may explicitly target another company via ?companyId=,
 * mirroring getCompanyFleet / getCompanyDashboard.
 */
const resolveTenant = (req, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  if (req.user.role === "company" && !companyId) {
    next(new AppError("No company tenant is linked to this user account.", 403));
    return null;
  }

  return companyId;
};

/**
 * GET /companies/settings — tenant-scoped settings deck: the operator's own
 * profile (including the private commercial-registry number) plus a live
 * readiness summary counted from the real vehicle register.
 */
export const getCompanySettings = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const settings = await companyService.fetchCompanySettings(companyId);

  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

/**
 * POST /companies/payouts/request — the operator asks the platform to run their
 * next settlement cycle into the recorded bank rail. Company sessions only:
 * the tenant is resolved from the session, so no other partner can be touched.
 */
export const requestCompanyPayout = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const result = await companyService.requestCompanyPayout(companyId);

  res.status(201).json({
    status: "success",
    data: { payout: result },
  });
});

export const updateCompanyCommission = catchAsync(async (req, res, next) => {
  const company = await companyService.updateCompanyCommissionRate(
    req.params.id,
    req.body.commissionRate,
  );

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const toggleCompanyVerification = catchAsync(async (req, res, next) => {
  const company = await companyService.toggleVerificationStatus(
    req.params.id,
    req.body.isVerified,
  );

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const updateCompanyStatus = catchAsync(async (req, res, next) => {
  const company = await companyService.updateCompanyStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const deleteCompany = catchAsync(async (req, res, next) => {
  await companyService.softDeleteCompanyById(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
