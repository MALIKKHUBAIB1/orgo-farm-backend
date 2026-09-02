import mongoose from "mongoose";

const heroSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    heroImage: { type: String, default: "" },
    overlayImage: { type: String, default: "" },
    tagline: { type: String, default: "", maxlength: 60 },
    title: { type: String, default: "", maxlength: 120 },
    subtitle: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true, versionKey: false },
);

export const HeroSettings = mongoose.model("HeroSettings", heroSettingsSchema);