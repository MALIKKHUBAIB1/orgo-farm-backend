import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

faqSchema.index({ sortOrder: 1, createdAt: 1 });

export const Faq = mongoose.model("Faq", faqSchema);