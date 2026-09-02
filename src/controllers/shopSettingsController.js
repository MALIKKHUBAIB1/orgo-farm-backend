import { ShopSettings } from "../models/ShopSettings.js";

const cleanList = (value, label, { limit = 60, itemLimit = 40 } = {}) => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`);
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const item = typeof raw === "string" ? raw.trim() : "";
    if (!item) continue;
    if (item.length > itemLimit) throw new Error(`${label} items must be ${itemLimit} characters or fewer`);
    if (seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push(item);
    if (out.length >= limit) throw new Error(`${label} can have at most ${limit} items`);
  }
  return out;
};

const cleanBuckets = (value) => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new Error("Price buckets must be a list");
  const out = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) throw new Error("Invalid price bucket");
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!label || label.length > 30) throw new Error("Bucket label is required and must be 30 characters or fewer");
    const min = raw.min === "" || raw.min === undefined || raw.min === null ? 0 : Number(raw.min);
    if (!Number.isFinite(min) || min < 0) throw new Error("Bucket min must be a positive number");
    const max = raw.max === "" || raw.max === undefined || raw.max === null ? null : Number(raw.max);
    if (max !== null && (!Number.isFinite(max) || max <= min)) throw new Error("Bucket max must be greater than min");
    out.push({ label, min, max });
    if (out.length >= 10) break;
  }
  return out;
};

export async function getShopSettings(_req, res) {
  try {
    const settings = await ShopSettings.findOne({ key: "main" }).lean();
    res.json({ settings: settings ?? null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function putShopSettings(req, res) {
  try {
    const body = req.body ?? {};
    const fields = {};
    if (body.categories !== undefined) {
      const categories = cleanList(body.categories, "Categories");
      if (categories !== null) fields.categories = categories;
    }
    if (body.concerns !== undefined) {
      const concerns = cleanList(body.concerns, "Skin concerns");
      if (concerns !== null) fields.concerns = concerns;
    }
    if (body.sorts !== undefined) {
      const sorts = cleanList(body.sorts, "Sort options");
      if (sorts !== null) fields.sorts = sorts;
    }
    if (body.priceBuckets !== undefined) {
      const priceBuckets = cleanBuckets(body.priceBuckets);
      if (priceBuckets !== null) fields.priceBuckets = priceBuckets;
    }
    if (body.inStockLabel !== undefined) {
      const inStockLabel = typeof body.inStockLabel === "string" ? body.inStockLabel.trim() : "";
      if (inStockLabel.length > 60) throw new Error("In-stock label must be 60 characters or fewer");
      fields.inStockLabel = inStockLabel || "In stock only";
    }
    const settings = await ShopSettings.findOneAndUpdate({ key: "main" }, { $set: fields }, { upsert: true, new: true }).lean();
    res.json({ settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}