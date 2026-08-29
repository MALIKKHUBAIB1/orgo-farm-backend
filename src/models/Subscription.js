import mongoose from "mongoose";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const subscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RX, "Invalid email address"],
      index: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);