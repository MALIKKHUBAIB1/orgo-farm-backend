import mongoose from "mongoose";

const curationSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tier: { type: String, enum: ["Bronze", "Silver", "Gold"], required: true },
    title: { type: String, required: true },
    label: { type: String, required: true },
    items: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    cta: { type: String, required: true },
  },
  { timestamps: true },
);

export const Curation = mongoose.model("Curation", curationSchema);
