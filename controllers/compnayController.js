import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as companyService from "../services/companyService.js";

export const getAllCompanies = catchAsync(async (req, res, next) => {
  const companies = await companyService.fetchAllCompanies(req.query);

  res.status(200).json({
    status: "success",
    results: companies.length,
    data: { companies },
  });
});

export const getCompanyByStorefrontIdentifier = catchAsync(async (req, res, next) => {
  const company = await companyService.fetchCompanyByStorefront(
    req.params.identifier
  );

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const getCompanyById = catchAsync(async (req, res, next) => {
  const company = await companyService.fetchCompanyById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const createCompany = catchAsync(async (req, res, next) => {
  const company = await companyService.createCompanyProfile(
    req.body,
    req.user.id
  );

  res.status(201).json({
    status: "success",
    data: { company },
  });
});

export const updateMyCompany = catchAsync(async (req, res, next) => {
  const companyId = req.tenantId || req.user.company;

  if (!companyId) {
    return next(new AppError("No company profile linked to this user account.", 400));
  }

  const updatedCompany = await companyService.updateCompanyProfileByOwner(
    companyId,
    req.body
  );

  res.status(200).json({
    status: "success",
    data: { company: updatedCompany },
  });
});

export const updateCompanyCommission = catchAsync(async (req, res, next) => {
  const company = await companyService.updateCompanyCommissionRate(
    req.params.id,
    req.body.commissionRate
  );

  res.status(200).json({
    status: "success",
    data: { company },
  });
});

export const toggleCompanyVerification = catchAsync(async (req, res, next) => {
  const company = await companyService.toggleVerificationStatus(
    req.params.id,
    req.body.isVerified
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