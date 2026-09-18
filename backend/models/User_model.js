import mongoose from "mongoose";
import validator from "validator";
import crypto from "crypto";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Core Identity
    // -------------------------------------------------------------------------
    name: {
      type: String,
      required: [true, "Please tell us your name"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email address"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "A phone number is required for rental confirmations"],
      trim: true,
    },
    photo: {
      type: String,
      default: "default.jpg",
    },

    // -------------------------------------------------------------------------
    // Role-Based Access Control (RBAC) & Multi-Tenancy
    // -------------------------------------------------------------------------
    role: {
      type: String,
      enum: {
        values: ["customer", "company", "admin"],
        message: "Role must be customer, company, or admin",
      },
      default: "customer", // Fixed: Default must match one of the enum values
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    // -------------------------------------------------------------------------
    // Security & Passwords
    // -------------------------------------------------------------------------
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // -------------------------------------------------------------------------
    // Operational Flags
    // -------------------------------------------------------------------------
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

// -----------------------------------------------------------------------------
// Indexes
// -----------------------------------------------------------------------------
userSchema.index({ role: 1, active: 1 });

// -----------------------------------------------------------------------------
// Hooks & Middleware
// -----------------------------------------------------------------------------

// 1. Password Encryption Hook
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

// 2. Update Password Timestamp Hook
userSchema.pre("save", function () {
  if (!this.isModified("password") || this.isNew) return;

  // Subtract 1 second to ensure JWT issued right after password change remains valid
  this.passwordChangedAt = Date.now() - 1000;
});

// 3. Query Hook: Hide soft-deleted/inactive users automatically
userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

// -----------------------------------------------------------------------------
// Instance Methods
// -----------------------------------------------------------------------------

// Password Verification
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if Password Was Changed After JWT Token Issuance
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate Password Reset Token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  return resetToken;
};

const User = mongoose.model("User", userSchema);

export default User;
