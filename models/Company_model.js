import mongoose from "mongoose";
import validator from "validator";

const companySchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Ownership & Credentials
    // -------------------------------------------------------------------------
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A rental company must be linked to an owner user account"],
      unique: true, // Guarantees 1 user owns at most 1 company
      index: true,
    },
    name: {
      type: String,
      required: [true, "Please provide the official company name"],
      trim: true,
      maxlength: [120, "Company name cannot exceed 120 characters"],
      index: true,
    },
    subdomain: {
      type: String,
      required: [true, "Company subdomain is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"],
      index: true,
    },
    // URL-friendly slug for path-based storefronts
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Company description cannot exceed 2000 characters"],
    },
    logo: {
      type: String,
      default: "default-company-logo.png",
    },

    // -------------------------------------------------------------------------
    // Contact & Business Verification
    // -------------------------------------------------------------------------
    email: {
      type: String,
      required: [true, "Company business email is required"],
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid company email"],
    },
    phone: {
      type: String,
      required: [true, "Company contact phone number is required"],
      trim: true,
    },
    commercialRegisterNumber: {
      type: String,
      trim: true,
      select: false, // Hidden by default from public queries for privacy
    },

    // -------------------------------------------------------------------------
    // Location & GeoJSON (Libyan Marketplace Focus)
    // -------------------------------------------------------------------------
    city: {
      type: String,
      required: [true, "Main company city is required (e.g., Tripoli, Benghazi)"],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, "Physical business address is required"],
      trim: true,
    },
    // GeoJSON point for map-based proximity search & branch pickups
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [13.1913, 32.8872], // Default coordinates (Tripoli, Libya)
      },
    },

    // -------------------------------------------------------------------------
    // Platform Lifecycle & Approval Workflow
    // -------------------------------------------------------------------------
    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"], // Guide Section 5 workflow
        message: "Status must be PENDING, APPROVED, SUSPENDED, or REJECTED",
      },
      default: "PENDING",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedAt: Date,
    suspendedAt: Date,

    // -------------------------------------------------------------------------
    // Financial Metrics & Commission Overrides
    // -------------------------------------------------------------------------
    // Custom commission override rate (if null, falls back to global default e.g. 8%)
    customCommissionRate: {
      type: Number,
      min: [0, "Commission cannot be negative"],
      max: [100, "Commission cannot exceed 100%"],
      default: null,
    },

    // -------------------------------------------------------------------------
    // Soft Delete & Operational State
    // -------------------------------------------------------------------------
    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // Prevent automated indexing performance bottlenecks on high-volume production deployments
    autoIndex: process.env.NODE_ENV !== "production",
  }
);

// -----------------------------------------------------------------------------
// Indexes (ESR Rule: Equality -> Sort -> Range)
// -----------------------------------------------------------------------------
companySchema.index({ status: 1, city: 1 });
companySchema.index({ location: "2dsphere" }); // Enables geospatial radius queries ($near)

// -----------------------------------------------------------------------------
// Virtual Population (Lookup Company Vehicles without manual queries)
// -----------------------------------------------------------------------------
companySchema.virtual("vehicles", {
  ref: "Vehicle",
  localField: "_id",
  foreignField: "companyId",
  justOne: false,
});

companySchema.virtual("activeBookingsCount", {
  ref: "Booking",
  localField: "_id",
  foreignField: "companyId",
  count: true,
});

// -----------------------------------------------------------------------------
// Hooks & Middleware
// -----------------------------------------------------------------------------

// 1. Pre-save Slug Generator (Transforms "Tripoli Cars" -> "tripoli-cars")
companySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  }
  next();
});

// 2. Query Hook: Exclude soft-deleted companies automatically
companySchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// 3. Status Transition Timestamp Auditor
companySchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "APPROVED" && !this.approvedAt) {
      this.approvedAt = new Date();
    } else if (this.status === "SUSPENDED") {
      this.suspendedAt = new Date();
    }
  }
  next();
});

// -----------------------------------------------------------------------------
// Instance & Static Methods
// -----------------------------------------------------------------------------

// Soft Delete instance method
companySchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.status = "SUSPENDED";
  return await this.save();
};

const Company = mongoose.model("Company", companySchema);

export default Company;