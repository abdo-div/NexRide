import express from "express";
import {
  getAllCompanies,
  getCompanyById,
  getCompanyByStorefrontIdentifier,
  createCompany,
  updateMyCompany,
  updateCompanyCommission,
  toggleCompanyVerification,
  deleteCompany,
} from "../controllers/companyController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { validateSubdomain } from "../middleware/subdomainValidator.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC MARKETPLACE & STOREFRONT ROUTES (Customers & Multi-Tenancy Resolution)
// -----------------------------------------------------------------------------

// Fetch active companies for the public marketplace directory (filterable by city)
router.get("/", getAllCompanies);

// High-performance storefront lookup (resolves via subdomain: "albaraka" OR slug: "al-baraka-rentals")
router.get("/storefront/:identifier", getCompanyByStorefrontIdentifier);

// Fetch public company profile by ObjectId
router.get("/:id", getCompanyById);

// -----------------------------------------------------------------------------
// PROTECTED TENANT & ADMIN ROUTES
// -----------------------------------------------------------------------------

// Enforce JWT authentication for all administrative operations
router.use(protect);

// Registration/Onboarding for new rental companies (includes reserved subdomain validation)
router.post(
  "/",
  restrictTo("company", "admin"),
  validateSubdomain,
  createCompany,
);

// Self-management route for company owners (updates profile, contact, logo, branch location)
router.patch(
  "/update-my-company",
  restrictTo("company"),
  validateSubdomain,
  updateMyCompany,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES (Super-Admin Governance)
// -----------------------------------------------------------------------------

// Adjust company-specific commission rates (overrides default 8% platform fee)
router.patch("/:id/commission", restrictTo("admin"), updateCompanyCommission);

// Toggle operational status or platform verification checkmark
router.patch("/:id/verify", restrictTo("admin"), toggleCompanyVerification);

// Administrative deletion (Soft-deletes company profile and hides active listings)
router.delete("/:id", restrictTo("admin"), deleteCompany);

export default router;
