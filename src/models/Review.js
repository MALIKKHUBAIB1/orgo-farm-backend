import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productSlug: { type: String, required: true, index: true, maxlength: 120 },
    name: { type: String, required: true, maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "", maxlength: 120 },
    comment: { type: String, required: true, maxlength: 1000 },
    approved: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

reviewSchema.index({ productSlug: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
