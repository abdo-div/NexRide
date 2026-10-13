import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    locale: {
      type: String,
      enum: ["ar", "en"],
      default: "ar",
    },
    source: {
      type: String,
      default: "website-footer",
      maxlength: 80,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

newsletterSubscriberSchema.index({ email: 1 }, { unique: true });

const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ||
  mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);

export default NewsletterSubscriber;
