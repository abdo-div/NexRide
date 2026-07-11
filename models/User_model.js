import mongoose from "mongoose";
import validator from "validator";
import crypto from "crypto";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "please tell us your name "],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "please provide your email"],
    unique: true,
    validate: [validator.isEmail, "please provide a valid email address"],
  },
  role: {
    type: String,
    enum: ["user", "employee", "admin"],
    default: "user",
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  phoneNumber: {
    type: String,
    required: [true, "a phone number is required for rental confirmations"],
  },
  photo: {
    type: String,
    default: "default.jpg", // Falls back to this if they haven't uploaded one yet
  },
  password: {
    type: String,
    required: [true, "please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "password are not the same",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});
// 1. Password Encryption Hook
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});
// 2. Update Password Timestamp Hook
userSchema.pre("save", async function () {
  // If the password hasn't changed, or if this is a brand new user, skip this hook
  if (!this.isModified("password") || this.isNew) return;

  // Update the timestamp
  this.passwordChangedAt = Date.now() - 1000;

  // NO NEXT() NEEDED! Mongoose handles it automatically because of 'async'
});
// 3. Query Hook to hide inactive accounts

userSchema.pre(/^find/, async function () {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

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

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);

export default User;
