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
// PUBLIC MARKETPLACE & STOREFRONT ROUTES
// -----------------------------------------------------------------------------
router.get("/", getAllCompanies);
router.get("/storefront/:identifier", getCompanyByStorefrontIdentifier);
router.get("/:id", getCompanyById);

// -----------------------------------------------------------------------------
// PROTECTED TENANT & ADMIN ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

router.post(
  "/",
  restrictTo("company", "admin"),
  validateSubdomain,
  createCompany
);

router.patch(
  "/update-my-company",
  restrictTo("company"),
  validateSubdomain,
  updateMyCompany
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
router.patch("/:id/commission", restrictTo("admin"), updateCompanyCommission);
router.patch("/:id/verify", restrictTo("admin"), toggleCompanyVerification);
router.delete("/:id", restrictTo("admin"), deleteCompany);

export default router;