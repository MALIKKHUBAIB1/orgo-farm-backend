import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 24 },
    message: { type: String, required: true, maxlength: 80 },
    type: { type: String, enum: ["percent", "fixed", "shipping"], default: "percent" },
    value: { type: Number, min: 0, default: 0 },
    minOrder: { type: Number, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const Coupon = mongoose.model("Coupon", couponSchema);
