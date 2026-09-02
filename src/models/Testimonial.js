import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    quote: { type: String, required: true, maxlength: 500 },
    product: { type: String, default: "", maxlength: 80 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    avatar: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);