import mongoose from "mongoose";

const instaPostSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    kind: { type: String, enum: ["reel", "p"], default: "reel" },
    alt: { type: String, required: true, trim: true, maxlength: 200 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

instaPostSchema.index({ sortOrder: 1, createdAt: 1 });

export const InstaPost = mongoose.model("InstaPost", instaPostSchema);