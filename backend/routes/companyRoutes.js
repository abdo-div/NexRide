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
/**
 * @openapi
 * /companies:
 *   get:
 *     tags: [Companies]
 *     summary: List approved marketplace fleet operators
 *     responses:
 *       200:
 *         description: Company list
 */
router.get("/", getAllCompanies);

/**
 * @openapi
 * /companies/storefront/{identifier}:
 *   get:
 *     tags: [Companies]
 *     summary: Resolve a company by public storefront identifier
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company storefront payload
 *       404:
 *         description: Storefront not found
 */
router.get("/storefront/:identifier", getCompanyByStorefrontIdentifier);

/**
 * @openapi
 * /companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Public company profile
 *     description: >-
 *       Exposes only publicly visible company fields; owner contact details
 *       and internal flags are never returned.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company document
 *       404:
 *         description: Company not found
 */
router.get("/:id", getCompanyById);

// -----------------------------------------------------------------------------
// PROTECTED TENANT & ADMIN ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// Self-service company onboarding. Any authenticated user (incl. customers)
// may request an account upgrade; no restrictTo here so roles can self-register.
/**
 * @openapi
 * /companies/register:
 *   post:
 *     tags: [Companies]
 *     summary: Request a company (fleet operator) account
 *     description: Any authenticated user may self-register an operator account.
 *     responses:
 *       201:
 *         description: Company account created
 *       400:
 *         description: Validation error
 */
router.post("/register", registerCompanyOwner);

/**
 * @openapi
 * /companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create a company record
 *     responses:
 *       201:
 *         description: Company created
 *       403:
 *         description: Company or admin role required
 */
router.post(
  "/",
  restrictTo("company", "admin"),
  validateSubdomain,
  validate(createCompanySchema),
  createCompany,
);

/**
 * @openapi
 * /companies/update-my-company:
 *   patch:
 *     tags: [Companies]
 *     summary: Update the authenticated company's profile
 *     responses:
 *       200:
 *         description: Company updated
 *       403:
 *         description: Company role required
 */
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
/**
 * @openapi
 * /companies/{id}/commission:
 *   patch:
 *     tags: [Admin]
 *     summary: Set a company commission rate
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commissionRate]
 *             properties:
 *               commissionRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Commission updated
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/commission",
  restrictTo("admin"),
  validate(updateCommissionSchema),
  updateCompanyCommission,
);

/**
 * @openapi
 * /companies/{id}/verify:
 *   patch:
 *     tags: [Admin]
 *     summary: Toggle company verification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification state changed
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/verify",
  restrictTo("admin"),
  validate(toggleVerificationSchema),
  toggleCompanyVerification,
);

/**
 * @openapi
 * /companies/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company deleted
 *       403:
 *         description: Admin role required
 */
router.delete("/:id", restrictTo("admin"), deleteCompany);

export default router;
