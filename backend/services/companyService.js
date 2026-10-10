import mongoose from "mongoose";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import { getCompanyPayoutBalance } from "./payoutService.js";
import { getPlatformPolicy } from "./platformPolicyService.js";

const COMPANY_SEARCH_FIELDS = [
  "name",
  "city",
  "address",
  "email",
  "phone",
  "subdomain",
  "slug",
  "description",
  "status",
];

/** Fetch approved, non-deleted companies for the public directory. */
export const fetchAllCompanies = async (queryParams) => {
  const features = new APIFeatures(
    Company.find({ status: "APPROVED", deletedAt: null }),
    queryParams,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

/** Fetch every company for platform administration, including inactive records. */
export const fetchAllAdminCompanies = async (queryParams) => {
  const { docs, pagination } = await runPaginatedQuery(
    Company,
    {},
    queryParams,
    { searchFields: COMPANY_SEARCH_FIELDS },
  );

  return { companies: docs, pagination };
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
    status: "APPROVED",
    deletedAt: null,
  });

  if (!company) {
    throw new AppError("No active rental company found with that storefront identifier", 404);
  }

  return company;
};

/** Fetch a public-safe company DTO by ID. */
export const fetchPublicCompanyById = async (companyId) => {
  const company = await Company.findOne({
    _id: companyId,
    status: "APPROVED",
    deletedAt: null,
  })
    .select("_id name slug logo coverImage description city phone")
    .lean();

  if (!company) {
    throw new AppError("No company found with that ID", 404);
  }

  return {
    _id: company._id,
    name: company.name,
    slug: company.slug,
    logo: company.logo,
    coverImage: company.coverImage,
    description: company.description,
    city: company.city,
    phone: company.phone,
  };
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
 * Record the operator's request for their next payout cycle. Disbursements are
 * approved & dispatched by the platform into the recorded bank rail, so this
 * only stamps the intent on the Company document and returns the currently
 * payable (unsettled) balance — never a synthetic payout.
 */
export const requestCompanyPayout = async (companyId) => {
  if (!companyId) {
    throw new AppError("Please provide a valid company tenant.", 400);
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError("No company found for this tenant.", 404);
  }

  if (!company.payout?.iban) {
    throw new AppError(
      "Add your settlement bank details (IBAN) in Settings before requesting a payout.",
      400,
    );
  }

  const [{ dueToCompany: pendingPayouts, outstandingCommission }, policy] =
    await Promise.all([
      getCompanyPayoutBalance(companyId),
      getPlatformPolicy(),
    ]);
  if (pendingPayouts <= policy.minimumPayout) {
    throw new AppError(
      `Net payout balance must reach ${policy.minimumPayout} before a request can be submitted.`,
      400,
    );
  }

  company.lastPayoutRequestAt = new Date();
  await company.save({ validateBeforeSave: false });

  return {
    requestedAt: company.lastPayoutRequestAt,
    pendingPayouts,
    minimumPayout: policy.minimumPayout,
    outstandingCommission,
    payout: company.payout,
  };
};

const SETTINGS_PROFILE_FIELDS = [
  "name",
  "email",
  "phone",
  "city",
  "address",
  "description",
  "logo",
];

/** Percentage of the public-facing profile fields that are actually filled in. */
const profileCompleteness = (company) => {
  const filled = SETTINGS_PROFILE_FIELDS.filter(
    (field) =>
      company[field] && String(company[field]).trim().length > 0,
  ).length;
  return Math.min(100, Math.round((filled / SETTINGS_PROFILE_FIELDS.length) * 100));
};

/**
 * Tenant-scoped settings payload. Returns the operator's own profile — including
 * the normally private commercial-registry number — plus a live readiness deck
 * derived from real records: fleet posture from the vehicle register and pickup
 * hubs from the distinct pickup locations actually in use today.
 */
export const fetchCompanySettings = async (companyId) => {
  if (!companyId) {
    throw new AppError("Please provide a valid company tenant.", 400);
  }

  const company = await Company.findById(companyId).select(
    "+commercialRegisterNumber +deletedAt",
  );

  if (!company) {
    throw new AppError("No company found for this tenant.", 404);
  }

  const scope = {
    companyId: new mongoose.Types.ObjectId(String(companyId)),
    deletedAt: null,
  };

  const [report] = await Vehicle.aggregate([
    { $match: scope },
    {
      $facet: {
        posture: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              published: {
                $sum: { $cond: [{ $eq: ["$listingStatus", "PUBLISHED"] }, 1, 0] },
              },
            },
          },
        ],
        hubs: [
          {
            $group: {
              _id: "$pickupLocation",
              city: { $first: "$city" },
              vehicles: { $sum: 1 },
            },
          },
          { $sort: { vehicles: -1 } },
        ],
      },
    },
  ]);

  const posture = report?.posture?.[0] ?? { total: 0, published: 0 };
  const rawHubs = Array.isArray(report?.hubs) ? report.hubs : [];

  return {
    profile: {
      _id: company._id,
      name: company.name,
      subdomain: company.subdomain,
      slug: company.slug,
      description: company.description ?? "",
      logo: company.logo ?? "",
      coverImage: company.coverImage ?? "",
      email: company.email,
      phone: company.phone,
      city: company.city,
      address: company.address,
      commercialRegisterNumber: company.commercialRegisterNumber ?? "",
      status: company.status,
      approvedAt: company.approvedAt ?? null,
      createdAt: company.createdAt ?? null,
      customCommissionRate: company.customCommissionRate ?? null,
      payout: company.payout ?? null,
      settingsPreferences: company.settingsPreferences ?? {},
    },
    readiness: {
      verified: company.status === "APPROVED",
      completeness: profileCompleteness(company),
      hubs: rawHubs.length,
      fleet: posture.total,
      published: posture.published,
    },
    hubs: rawHubs.map((hub, index) => ({
      name: hub._id,
      city: hub.city,
      vehicles: hub.vehicles,
      primary: index === 0,
    })),
  };
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
