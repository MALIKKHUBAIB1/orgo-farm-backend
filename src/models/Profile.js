import mongoose from "mongoose";
import crypto from "node:crypto";

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, default: () => crypto.randomUUID() },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pin: { type: String, default: "" },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true },
    phone: { type: String, default: "" },
    address: { type: addressSchema, default: () => ({}) },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true },
);

export const Profile = mongoose.model("Profile", profileSchema);
