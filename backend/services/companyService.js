import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

/**
 * Fetch all active companies matching search/filter criteria
 */
export const fetchAllCompanies = async (queryParams) => {
  const features = new APIFeatures(Company.find({ active: { $ne: false } }), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

/**
 * High-performance storefront lookup via custom subdomain or slug
 */
export const fetchCompanyByStorefront = async (identifier) => {
  const company = await Company.findOne({
    $or: [
      { subdomain: identifier.toLowerCase() },
      { slug: identifier.toLowerCase() },
    ],
    active: { $ne: false },
  });

  if (!company) {
    throw new AppError("No active rental company found with that storefront identifier", 404);
  }

  return company;
};

/**
 * Fetch single company by ID
 */
export const fetchCompanyById = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  return company;
};

/**
 * Register a new rental company tenant profile
 */
export const createCompanyProfile = async (companyData, ownerUserId) => {
  const existingCompany = await Company.findOne({
    $or: [{ owner: ownerUserId }, { name: companyData.name }],
  });

  if (existingCompany) {
    throw new AppError("Company account or company name already exists", 400);
  }

  const newCompany = await Company.create({
    ...companyData,
    owner: ownerUserId,
  });

  return newCompany;
};

/**
 * Self-update company profile details by company owner
 */
export const updateCompanyProfileByOwner = async (companyId, updateData) => {
  const company = await Company.findByIdAndUpdate(companyId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!company) {
    throw new AppError("No company found linked to this account", 404);
  }

  return company;
};

/**
 * Update custom commission rate (Platform Admin)
 */
export const updateCompanyCommissionRate = async (companyId, commissionRate) => {
  if (commissionRate === undefined || commissionRate < 0) {
    throw new AppError("Please provide a valid non-negative commission rate", 400);
  }

  const company = await Company.findByIdAndUpdate(
    companyId,
    { customCommissionRate: commissionRate },
    { new: true, runValidators: true }
  );

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  return company;
};

/**
 * Toggle verification status of a company (Platform Admin)
 */
export const toggleVerificationStatus = async (companyId, isVerified) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  company.isVerified = isVerified !== undefined ? isVerified : !company.isVerified;
  await company.save({ validateBeforeSave: false });

  return company;
};

/**
 * Update company status (PENDING -> APPROVED / SUSPENDED / REJECTED, Platform Admin)
 * Uses document.save() so the pre-save hook stamps approvedAt / suspendedAt.
 */
export const updateCompanyStatus = async (companyId, status) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  company.status = status;
  await company.save({ validateBeforeSave: false });

  return company;
};

/**
 * Soft delete company profile (Platform Admin)
 */
export const softDeleteCompanyById = async (companyId) => {
  const company = await Company.findByIdAndUpdate(
    companyId,
    { deletedAt: new Date(), status: "SUSPENDED" },
    { new: true }
  );

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  return null;
};