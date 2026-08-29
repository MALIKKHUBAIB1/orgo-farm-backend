import mongoose from "mongoose";

const shopStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    items: {
      type: [
        {
          slug: { type: String, required: true },
          qty: { type: Number, required: true, min: 1 },
        },
      ],
      default: [],
    },
    wishlist: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const ShopState = mongoose.model("ShopState", shopStateSchema);
