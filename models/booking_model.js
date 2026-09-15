import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Core Relationships
    // -------------------------------------------------------------------------
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A booking must belong to a customer"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "A booking must belong to a rental company"],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "A booking must be linked to a vehicle"],
      index: true,
    },

    // -------------------------------------------------------------------------
    // Dates & Pickup Details
    // -------------------------------------------------------------------------
    startDate: {
      type: Date,
      required: [true, "Pickup date is required"],
      validate: {
        validator: (value) => value instanceof Date && !Number.isNaN(value.getTime()),
        message: "Pickup date must be a valid date",
      },
    },
    endDate: {
      type: Date,
      required: [true, "Return date is required"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "Return date ({VALUE}) must be after the pickup date",
      },
    },
    pickupMethod: {
      type: String,
      enum: ["BRANCH_PICKUP", "DELIVERY"],
      default: "BRANCH_PICKUP",
    },
    pickupLocation: {
      type: String,
      required: [true, "Pickup location address or branch name is required"],
      trim: true,
      maxlength: [300, "Pickup location cannot exceed 300 characters"],
    },

    // -------------------------------------------------------------------------
    // Immutable Financial Snapshots
    // -------------------------------------------------------------------------
    dailyRate: {
      type: Number,
      required: [true, "Daily vehicle rate snapshot is required"],
      min: [0, "Rate cannot be negative"],
    },
    totalDays: {
      type: Number,
      required: true,
      min: [1, "Total days must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Total days must be a whole number",
      },
    },
    rentalPrice: {
      type: Number,
      required: true,
      min: [0, "Rental price cannot be negative"],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    // NexRide Marketplace Commission Snapshots
    commissionRate: {
      type: Number,
      required: true,
      default: 8, // Default 8% platform fee unless company custom rate applies
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    companyShare: {
      type: Number,
      required: true,
      min: 0,
    },

    // -------------------------------------------------------------------------
    // State Lifecycles (Booking vs Payment)
    // -------------------------------------------------------------------------
    bookingStatus: {
      type: String,
      enum: {
        values: [
          "PENDING_PAYMENT",
          "PAID",
          "CONFIRMED",
          "ACTIVE",
          "COMPLETED",
          "CANCELLED",
          "EXPIRED",
        ],
        message: "Invalid booking status transition",
      },
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ["UNPAID", "PAID", "REFUNDED", "PARTIALLY_REFUNDED"],
        message: "Invalid payment status",
      },
      default: "UNPAID",
      index: true,
    },

    // Cancellation metadata
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  }
);

// -----------------------------------------------------------------------------
// Indexes for Fast Availability Lookup & Tenant Filtering
// -----------------------------------------------------------------------------
// Prevents overlap queries from taking up excessive DB CPU
bookingSchema.index({ vehicleId: 1, startDate: 1, endDate: 1, bookingStatus: 1 });
bookingSchema.index({ companyId: 1, bookingStatus: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ vehicleId: 1, startDate: 1, bookingStatus: 1 });

// -----------------------------------------------------------------------------
// Hooks & Middleware
// -----------------------------------------------------------------------------

// Server-side Financial Calculation Engine Hook
bookingSchema.pre("validate", async function (next) {
  // Only calculate on initial creation or when dates change
  if (
    !this.isNew &&
    !this.isModified("startDate") &&
    !this.isModified("endDate") &&
    !this.isModified("vehicleId") &&
    !this.isModified("companyId") &&
    !this.isModified("discountAmount")
  ) {
    return next();
  }

  try {
    const vehicle = await mongoose.model("Vehicle").findById(this.vehicleId).select("dailyPrice companyId");
    if (!vehicle) {
      return next(new Error("Selected vehicle does not exist"));
    }

    const company = await mongoose.model("Company").findById(this.companyId);
    if (!company) {
      return next(new Error("Selected rental company does not exist"));
    }
    if (vehicle.companyId.toString() !== this.companyId.toString()) {
      return next(new Error("Vehicle does not belong to the selected company"));
    }

    // 1. Snapshot vehicle daily price & company commission rate
    this.dailyRate = vehicle.dailyPrice;
    this.commissionRate = company.customCommissionRate ?? 8;

    // 2. Calculate rental duration (minimum 1 day)
    const timeDiff = Math.abs(this.endDate - this.startDate);
    this.totalDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    // 3. Compute base amounts
    this.rentalPrice = this.totalDays * this.dailyRate;
    this.totalAmount = Math.max(0, this.rentalPrice - this.discountAmount);

    // 4. Compute immutable NexRide commission & Company Payout split
    this.commissionAmount = Number(((this.totalAmount * this.commissionRate) / 100).toFixed(2));
    this.companyShare = Number((this.totalAmount - this.commissionAmount).toFixed(2));

    next();
  } catch (err) {
    next(err);
  }
});

// Auto-populate query hook
bookingSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customerId",
    select: "name email phoneNumber",
  })
    .populate({
      path: "vehicleId",
      select: "make model year dailyPrice photos transmission fuelType",
    })
    .populate({
      path: "companyId",
      select: "name phone city whatsapp logo",
    });

  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;