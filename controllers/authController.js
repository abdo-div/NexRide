import crypto from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import User from "./../models/User_model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "./../utils/email.js";

//  Sign JWT payload signature

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

//  Issue token cookie and send standardized client response

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  // Configure cookie options for secure browser session handling

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, // Prevents cross-site scripting (XSS) token theft
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Strip password from the response payload output for security
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

//  1. SIGNUP: Account registration & welcome dispatch

export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    phoneNumber: req.body.phoneNumber,
  });
  // Dispatch a welcoming email notification asynchronously
  //const url = `${req.protocol}://${req.get("host")}/me`;
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

// 2. LOGIN: Check credentials and return session token

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // Explicitly pull the password since it is hidden by default in the schema
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, req, res);
});

// 🚪 3. LOGOUT: Wipe session cookie values clean

export const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  if (req.headers.accept && req.headers.accept.includes("html")) {
    res.redirect("/");
    return;
  }
  res.status(200).json({ status: "success" });
};
// 🛡️ 4. PROTECT: Strict gatekeeper route protection middleware
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Look for token in authorization headers or incoming browser cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  // Verify the integrity of the incoming token string
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET || "fallback-super-secret-key-change-this",
  );

  // Verify the token owner is still present in the system database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  // Confirm the user hasn't changed their password since this token was generated
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  // Success: Pass the user details forward downstream to subsequent controllers
  req.user = currentUser;
  res.locals.user = currentUser; // Accessible inside server-side view templates
  next();
});

// 👁️ 5. IS LOGGED IN: Soft session analysis for server-side view rendering

export const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET || "fallback-super-secret-key-change-this",
      );
      const currentUser = await User.findById(decoded.id);

      if (!currentUser || currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // Session valid: store user details inside template locals quietly
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next(); // Session broken: continue anonymously without crashing
    }
  }
  next();
};

//  6. RESTRICT TO: Authorization role clearance barrier
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("you do not have permission to perform this action", 403),
      );
    }
    next();
  };
};

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("there is no user with that email address", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get(
      "host",
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "token sent to email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "there was an error sending the email. try again later!",
        500,
      ),
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("your current password is wrong", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, req, res);
});
