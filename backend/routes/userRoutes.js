import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { safePagination } from "../middlewares/pagination.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "../validations/auth.validation.js";
import {
  updateMeSchema,
  adminUpdateUserSchema,
  updateUserStatusSchema,
} from "../validations/user.validation.js";
import { idParamSchema } from "../validations/common.validation.js";
import {
  getMe,
  getUserById,
  getAllUsers,
  updateMe,
  deleteMe,
  updateUser,
  updateUserStatus,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto,
} from "../controllers/userController.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC AUTHENTICATION & ACCOUNT RECOVERY ROUTES
// -----------------------------------------------------------------------------

/**
 * @openapi
 * /users/signup:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Validation error
 */
router.post("/signup", validate(signupSchema), signup);

/**
 * @openapi
 * /users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in and receive a JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Authenticated; JWT returned and set as a cookie
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), login);

/**
 * @openapi
 * /users/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Clear the session cookie
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", logout);

/**
 * @openapi
 * /users/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a password reset token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset instructions sent when the account exists
 *       400:
 *         description: Validation error
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/forgotPassword", validate(forgotPasswordSchema), forgotPassword);

/**
 * @openapi
 * /users/reset-password/{token}:
 *   patch:
 *     tags: [Authentication]
 *     summary: Set a new password using a reset token
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, passwordConfirm]
 *             properties:
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid or expired token
 */
router.patch(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  resetPassword,
);
router.patch(
  "/resetPassword/:token",
  validate(resetPasswordSchema),
  resetPassword,
);

// -----------------------------------------------------------------------------
// PROTECTED USER SELF-SERVICE ROUTES (Authenticated Users)
// -----------------------------------------------------------------------------
router.use(protect);

/**
 * @openapi
 * /users/update-my-password:
 *   patch:
 *     tags: [Users]
 *     summary: Change the password of the authenticated user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, password, passwordConfirm]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Current password incorrect
 */
router.patch(
  "/update-my-password",
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch(
  "/updateMyPassword",
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch("/updatePassword", validate(updatePasswordSchema), updatePassword);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Profile of the authenticated user
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get("/me", getMe, getUserById);

/**
 * @openapi
 * /users/update-me:
 *   patch:
 *     tags: [Users]
 *     summary: Update the authenticated user's profile
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 */
router.patch(
  "/update-me",
  uploadUserPhoto,
  resizeUserPhoto,
  validate(updateMeSchema),
  updateMe,
);
router.patch(
  "/updateMe",
  uploadUserPhoto,
  resizeUserPhoto,
  validate(updateMeSchema),
  updateMe,
);
/**
 * @openapi
 * /users/delete-me:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete the authenticated user's account
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Not authenticated
 */
router.delete("/delete-me", deleteMe);
router.delete("/deleteMe", deleteMe);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN & GOVERNANCE ROUTES (Super-Admin Portal)
// -----------------------------------------------------------------------------
router.use(restrictTo("admin"));

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Admin]
 *     summary: List registered users
 *     description: >-
 *       Roles are passed straight into the User query, so only real schema
 *       fields may be used as filters (e.g. role=customer).
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, company, admin]
 *     responses:
 *       200:
 *         description: Matching users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 */
router
  .route("/")
  .get(safePagination(20, 100), getAllUsers)
  .post(validate(signupSchema), signup);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Change a user account status
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, BANNED]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/status",
  validate(updateUserStatusSchema),
  updateUserStatus,
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Fetch one user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User document
 *       404:
 *         description: User not found
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin role required
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin role required
 */
router
  .route("/:id")
  .get(validate(idParamSchema()), getUserById)
  .patch(validate(adminUpdateUserSchema), updateUser)
  .delete(validate(idParamSchema()), deleteUser);

export default router;
