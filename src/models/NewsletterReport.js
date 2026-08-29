import mongoose from "mongoose";

const newsletterReportSchema = new mongoose.Schema(
  {
    productNames: { type: [String], default: [] },
    productSlugs: { type: [String], default: [] },
    subject: { type: String, default: "" },
    sentTo: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["sent", "no-subscribers", "no-products"],
      default: "sent",
    },
  },
  { timestamps: true },
);

newsletterReportSchema.index({ createdAt: -1 });

export const NewsletterReport = mongoose.model("NewsletterReport", newsletterReportSchema);