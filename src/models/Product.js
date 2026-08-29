import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    eachNote: String,
    badge: String,
    category: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    concerns: { type: [String], default: [], index: true },
    short: { type: String, required: true },
    description: { type: String, required: true },
    benefits: { type: [String], default: [] },
    ingredients: { type: String, required: true },
    howToUse: { type: String, required: true },
    suitableFor: { type: String, default: "" },
    image: { type: String, required: true },
    gallery: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
