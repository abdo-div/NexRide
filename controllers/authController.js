import catchAsync from "../utils/catchAsync.js";
import * as authService from "../services/authService.js";

/**
 * Helper utility to sign JWT and attach HTTP-only cookie
 */
const createSendToken = (user, statusCode, req, res) => {
  const token = authService.signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

export const signup = catchAsync(async (req, res, next) => {
  const newUser = await authService.registerUser(
    req.body,
    req.get("host"),
    req.protocol
  );
  createSendToken(newUser, 201, req, res);
});

export const login = catchAsync(async (req, res, next) => {
  const user = await authService.authenticateUser(
    req.body.email,
    req.body.password
  );
  createSendToken(user, 200, req, res);
});

export const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
};

export const forgotPassword = catchAsync(async (req, res, next) => {
  const host = req.get("host");
  await authService.requestPasswordReset(req.body.email, host, req.protocol);

  res.status(200).json({
    status: "success",
    message: "Token sent to email",
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const user = await authService.resetUserPasswordWithToken(
    req.params.token,
    req.body.password,
    req.body.passwordConfirm
  );

  createSendToken(user, 200, req, res);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const user = await authService.updateAuthenticatedUserPassword(
    req.user.id,
    req.body.passwordCurrent,
    req.body.password,
    req.body.passwordConfirm
  );

  createSendToken(user, 200, req, res);
});