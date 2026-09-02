import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    ip: { type: String, default: "", index: true },
    path: { type: String, default: "" },
    method: { type: String, default: "GET" },
    userAgent: { type: String, default: "" },
    browser: { type: String, default: "" },
    os: { type: String, default: "" },
    device: { type: String, default: "" },
    referrer: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    took: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

visitSchema.index({ createdAt: -1 });

export const Visit = mongoose.model("Visit", visitSchema);