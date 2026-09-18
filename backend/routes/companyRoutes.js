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
import { registerCompanyOwner } from "../controllers/companyRegistrationController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validateSubdomain } from "../middlewares/subdomainValidator.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCompanySchema,
  updateCompanySchema,
  updateCommissionSchema,
  toggleVerificationSchema,
} from "../validations/company.validation.js";

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

// Self-service company onboarding. Any authenticated user (incl. customers)
// may request an account upgrade; no restrictTo here so roles can self-register.
router.post("/register", registerCompanyOwner);

router.post(
  "/",
  restrictTo("company", "admin"),
  validateSubdomain,
  validate(createCompanySchema),
  createCompany,
);

router.patch(
  ["/update-my-company", "/updateMyCompany"],
  restrictTo("company"),
  validateSubdomain,
  validate(updateCompanySchema),
  updateMyCompany,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
router.patch(
  "/:id/commission",
  restrictTo("admin"),
  validate(updateCommissionSchema),
  updateCompanyCommission,
);
router.patch(
  "/:id/verify",
  restrictTo("admin"),
  validate(toggleVerificationSchema),
  toggleCompanyVerification,
);
router.delete("/:id", restrictTo("admin"), deleteCompany);

export default router;
