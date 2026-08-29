import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { Curation } from "../models/Curation.js";
import { products, curations } from "./data.js";

async function seed() {
  await connectDB();
  await Promise.all([Product.deleteMany({}), Curation.deleteMany({})]);
  const [p, c] = await Promise.all([Product.insertMany(products), Curation.insertMany(curations)]);
  console.log(`[seed] inserted ${p.length} products, ${c.length} curations`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err.message);
  process.exit(1);
});
