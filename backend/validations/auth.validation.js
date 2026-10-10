import { z } from "zod";

const email = z.string().email("Please provide a valid email address");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters long");
const passwordConfirm = z.string().min(1, "Please confirm your password");

const passwordsMatch = (data) => data.password === data.passwordConfirm;
const passwordMismatch = {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
};

/**
 * Sign-in accepts either an email address or a phone number, matching the
 * "Corporate Email or Libyan Mobile" field on the client sign-in screen.
 */
const identifier = z
  .string()
  .trim()
  .min(1, "Please provide your email address or mobile number");

export const signupSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Please tell us your name")
        .max(100, "Name cannot exceed 100 characters"),
      email,
      phoneNumber: z
        .string()
        .trim()
        .min(1, "A phone number is required for rental confirmations"),
      password,
      passwordConfirm,
    })
    .refine(passwordsMatch, passwordMismatch),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: identifier.optional(),
      identifier: identifier.optional(),
      password: z.string().min(1, "Please provide a password"),
    })
    .refine(
      (data) => Boolean(data.email || data.identifier),
      {
        message: "Please provide your email address or mobile number",
        path: ["identifier"],
      }
    ),
});

export const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: identifier.optional(),
      identifier: identifier.optional(),
    })
    .refine((data) => Boolean(data.email || data.identifier), {
      message: "Please provide your email address or mobile number",
      path: ["identifier"],
    }),
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Reset token is required"),
  }),
  body: z
    .object({ password, passwordConfirm })
    .refine(passwordsMatch, passwordMismatch),
});

export const updatePasswordSchema = z.object({
  body: z
    .object({
      passwordCurrent: z.string().min(1, "Please provide your current password"),
      password,
      passwordConfirm,
    })
    .refine(passwordsMatch, passwordMismatch),
});
