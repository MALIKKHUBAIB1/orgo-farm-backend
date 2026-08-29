import mongoose from "mongoose";

const lineSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    lines: { type: [lineSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, required: true, trim: true, maxlength: 30 },
    },
    address: {
      address: { type: String, required: true, trim: true, maxlength: 250 },
      city: { type: String, required: true, trim: true, maxlength: 80 },
      state: { type: String, required: true, trim: true, maxlength: 80 },
      pin: { type: String, required: true, trim: true, maxlength: 20 },
    },
    shipping: { type: String, enum: ["standard", "fast"], default: "standard" },
    payment: { type: String, required: true },
    status: { type: String, enum: ["placed", "confirmed", "shipped", "delivered", "cancelled"], default: "placed" },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
