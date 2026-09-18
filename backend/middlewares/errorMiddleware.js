import AppError from "../utils/appError.js";

/**
 * Transforms Mongoose CastError (invalid ObjectIDs)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Transforms MongoDB duplicate key errors (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  // Safely extract value from err.keyValue or err.message
  let value = "";
  if (err.keyValue) {
    value = Object.values(err.keyValue)[0];
  } else if (err.errmsg) {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    value = match ? match[0] : "";
  }

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Transforms Mongoose schema validation errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

/**
 * Transforms JWT signature errors
 */
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

/**
 * Transforms JWT expiration errors
 */
const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

/**
 * Development Error Response: Detailed output for debugging
 */
const sendErrorDev = (err, req, res) => {
  // A) API response
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) Rendered Website
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
    statusCode: err.statusCode,
  });
};

/**
 * Production Error Response: Safe output without leaking stack traces
 */
const sendErrorProd = (err, req, res) => {
  // A) API response
  if (req.originalUrl.startsWith("/api")) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programming or unknown error: log details internally
    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }

  // B) Rendered Website
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
      statusCode: err.statusCode,
    });
  }

  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: "Please try again later.",
    statusCode: err.statusCode,
  });
};

/**
 * Global Error Handling Middleware
 */
export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "production") {
    // Shallow copy retaining prototypes and non-enumerable properties
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(err, req, res);
  }
};