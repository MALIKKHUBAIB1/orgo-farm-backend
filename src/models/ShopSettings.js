import mongoose from "mongoose";

const bucketSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, maxlength: 30 },
    min: { type: Number, min: 0, default: 0 },
    max: { type: Number, default: null },
  },
  { _id: false },
);

const shopSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    categories: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    priceBuckets: { type: [bucketSchema], default: [] },
    sorts: { type: [String], default: [] },
    inStockLabel: { type: String, default: "In stock only", maxlength: 60 },
  },
  { timestamps: true, versionKey: false },
);

export const ShopSettings = mongoose.model("ShopSettings", shopSettingsSchema);