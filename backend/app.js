import express from "express";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

// ============================================
// ROUTES
// ============================================

import userRouter from "./routes/userRoutes.js";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import moamalatRouter from "./routes/moamalatRoutes.js";
import vehicleRouter from "./routes/vehicleRoutes.js";
import viewRouter from "./routes/viewRoutes.js";
import adminRouter from "./routes/admin.routes.js";
import newsletterRouter from "./routes/newsletterRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import supportTicketRouter from "./routes/supportTicketRoutes.js";
import customerVehicleActivityRouter from "./routes/customerVehicleActivityRoutes.js";
import savedSearchRouter from "./routes/savedSearchRoutes.js";
import rewardRouter from "./routes/rewardRoutes.js";
import {
  getGatewayConfig,
  createPayment,
  verifyPayment,
} from "./controllers/moamalatController.js";

// ============================================
// SECURITY
// ============================================

import {
  securityHeaders,
  securityCors,
  sanitizeNoSQL,
} from "./middlewares/security.middleware.js";
import { protect, restrictTo } from "./middlewares/authMiddleware.js";
import { validate } from "./middlewares/validate.middleware.js";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "./validations/moamalat.validation.js";

// ============================================
// RATE LIMITING
// ============================================

import { apiLimiter, authLimiter, newsletterLimiter, paymentVerificationLimiter } from "./middlewares/rateLimitMiddleware.js";

// ============================================
// TENANT
// ============================================

import { resolveTenant } from "./middlewares/tenantMiddleware.js";

// ============================================
// IDEMPOTENCY
// ============================================


// ============================================
// LOGGING
// ============================================

import { httpLogger } from "./middlewares/logger.middleware.js";

// ============================================
// HEALTH CHECKS
// ============================================

import { getLiveness, getReadiness } from "./controllers/health.controller.js";

// ============================================
// SWAGGER
// ============================================

import { swaggerSpec } from "./config/swagger.js";

// ============================================
// ERROR HANDLING
// ============================================

import AppError from "./utils/appError.js";
import globalErrorHandler from "./middlewares/errorMiddleware.js";
import { isDevelopment } from "./config/env.js";
import {
  companyImagesDirectory,
  userImagesDirectory,
  vehicleImagesDirectory,
} from "./config/publicStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendPublicPath = path.join(__dirname, "public");
const frontendDistPath = process.env.FRONTEND_DIST_DIR
  ? path.resolve(process.env.FRONTEND_DIST_DIR)
  : path.resolve(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

const app = express();

// ============================================
// 1. REVERSE PROXY TRUST
// ============================================

// The app runs behind a single reverse proxy (Nginx / Render / Fly). Trusting
// exactly one hop makes `req.protocol` and `req.ip` reflect X-Forwarded-Proto
// and X-Forwarded-For, so `secure` cookies are issued over TLS and rate
// limiters bucket by real client IP instead of the proxy's.
//
// Trusting `true` would be worse than not setting this at all: any client could
// forge its own forwarded headers and both spoof its IP past the limiters and
// downgrade the protocol cookie. A numeric hop count is the safe middle ground
// because the deployed topology has a fixed depth.
app.set("trust proxy", 1);

// ============================================
// 2. STRUCTURED HTTP LOGGING
// ============================================

app.use(httpLogger);

// ============================================
// 2. HEALTH CHECKS
// ============================================

app.get("/health/liveness", getLiveness);

app.get("/health/readiness", getReadiness);

// ============================================
// 3. VIEW ENGINE
// ============================================

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// ============================================
// 4. SECURITY HEADERS & CORS
// ============================================

app.use(securityHeaders);
app.use(securityCors);

// ============================================
// 5. DEVELOPMENT LOGGING
// ============================================

if (isDevelopment()) {
  // Custom format rather than "dev": the built-in dev format omits headers but
  // logs the full URL, which can carry tokens in query parameters (gateway
  // callbacks, password-reset codes). The path only is logged here; the
  // structured logger above carries the same information safely.
  morgan.token("safe-url", (req) => req.originalUrl?.split("?")[0] ?? req.url);
  app.use(morgan(":method :safe-url :status :res[content-type] - :response-time ms"));
}

// ============================================
// 6. STATIC FILES
// ============================================

// Static middleware must run before view, API and SPA fallback routes. Disabling
// serve-static's directory redirects is important here: a request such as
// /public/index.html must never bounce between a directory URL and the SPA.
const staticOptions = { index: false, redirect: false };

// Generated media lives outside the release checkout in production. Preserve
// the historical /vehicles, /users, /companies and /public/* URLs so existing
// database filenames and clients continue to work after the storage move.
const generatedMediaOptions = {
  ...staticOptions,
  dotfiles: "deny",
  immutable: true,
  maxAge: "1y",
};
for (const [route, directory] of [
  ["/vehicles", vehicleImagesDirectory],
  ["/users", userImagesDirectory],
  ["/companies", companyImagesDirectory],
]) {
  app.use(route, express.static(directory, generatedMediaOptions));
  app.use(`/public${route}`, express.static(directory, generatedMediaOptions));
}

app.use("/public", express.static(backendPublicPath, staticOptions));
app.use(express.static(backendPublicPath, staticOptions));

if (hasFrontendBuild) {
  // Keep compatibility with the old /public/index.html entry URL, but return
  // the SPA document directly instead of redirecting to another public URL.
  app.get("/public/index.html", (req, res) => {
    res.sendFile(frontendIndexPath);
  });

  // Vite emits assets at the build root (/assets, /favicon.svg, etc.). The
  // /public mount also supports legacy references such as /public/screen.png.
  app.use("/public", express.static(frontendDistPath, staticOptions));
  app.use(express.static(frontendDistPath, staticOptions));
}

// ============================================
// 7. BODY PARSING
// ============================================

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ============================================
// 8. NOSQL SANITIZATION
// ============================================

app.use(sanitizeNoSQL);

// ============================================
// 9. API RATE LIMITING + TENANT RESOLUTION
// ============================================

app.use("/api/v1", apiLimiter, resolveTenant);

// ============================================
// 10. AUTH RATE LIMITING
// ============================================

app.use(
  [
    "/api/v1/users/signup",
    "/api/v1/users/login",
    "/api/v1/auth/google",
    "/api/v1/users/forgot-password",
    "/api/v1/users/reset-password",
    "/api/v1/companies/apply",
  ],
  authLimiter,
);

// ============================================
// 12. API DOCUMENTATION
// ============================================

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================
// 13. APPLICATION ROUTES
// ============================================

// The Pug pages are retained as a development/legacy fallback only. When a
// React production build is present, letting these routes run first would
// intercept SPA paths such as /fleet before the HTML fallback can serve them.
if (!hasFrontendBuild) {
  app.use("/", viewRouter);
}

app.use("/api/v1/cars", vehicleRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/payments/moamalat", moamalatRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/vehicles", vehicleRouter);
app.use("/api/v1/newsletter", newsletterLimiter, newsletterRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/support-tickets", supportTicketRouter);
app.use("/api/v1/customer-vehicle-activity", customerVehicleActivityRouter);
app.use("/api/v1/saved-searches", savedSearchRouter);
app.use("/api/v1/rewards", rewardRouter);

// Moamalat direct integration routes (manager specification)
app.get("/api/config", getGatewayConfig);
app.post(
  "/api/payment/create",
  protect,
  restrictTo("customer"),
  validate(initiatePaymentSchema),
  createPayment,
);
app.post(
  "/api/payment/verify",
  protect,
  restrictTo("customer"),
  paymentVerificationLimiter,
  validate(verifyPaymentSchema),
  verifyPayment,
);

app.use("/api/v1/admin", adminRouter);

// ============================================
// 14. REACT SPA FALLBACK
// ============================================

if (hasFrontendBuild) {
  app.get("/{*path}", (req, res, next) => {
    const requestPath = req.path.toLowerCase();
    const isApiRequest =
      requestPath === "/api" || requestPath.startsWith("/api/");
    const isPublicFileRequest =
      requestPath === "/public" || requestPath.startsWith("/public/");
    const isPhysicalFileRequest = path.posix.extname(requestPath) !== "";
    const acceptsHtml = req.accepts("html");

    // Missing assets and API endpoints must remain real 404s. Serving the SPA
    // for either masks deployment errors and can create redirect loops in an
    // upstream static host.
    if (
      isApiRequest ||
      isPublicFileRequest ||
      isPhysicalFileRequest ||
      !acceptsHtml
    ) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}


// ============================================
// 15. 404 - ROUTE NOT FOUND
// ============================================

app.all("/{*path}", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ============================================
// 16. GLOBAL ERROR HANDLER
// ============================================

app.use(globalErrorHandler);

export default app;
