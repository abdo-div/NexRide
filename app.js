import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import carRouter from "./routes/carRoutes.js";
import userRouter from "./routes/userRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import vehicleRouter from "./routes/vehicleRoutes.js";
import viewRouter from "./routes/viewRoutes.js";

import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use("/", viewRouter);
app.use("/api/v1/cars", carRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/vehicles", vehicleRouter);

app.all("/{*path}", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
//using global error handling
app.use(globalErrorHandler);

export default app;
