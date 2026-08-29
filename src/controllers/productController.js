import { Product } from "../models/Product.js";
import { validationError } from "../middleware/security.js";

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_TEXT_RX = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

function parseList(v) {
  if (!v) return [];
  const values = Array.isArray(v) ? v : v.split(",");
  return values.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean).slice(0, 10);
}

function text(value, label, { required = true, max = 500 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length > max || !SAFE_TEXT_RX.test(normalized)) throw new Error(`${label} is invalid`);
  return normalized;
}

function listOfStrings(value, label, max = 10) {
  if (value === undefined || value === null) return undefined;
  const values = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = values.map((s) => text(String(s), label, { required: false, max: 120 })).filter(Boolean);
  if (cleaned.length > max) throw new Error(`${label} has too many items`);
  return cleaned;
}

function number(value, label, { required = true, min = 0, max = 1000000 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be a number between ${min} and ${max}`);
  return Math.round(n * 100) / 100;
}

export function parseProduct(body, existing = {}) {
  const fields = {
    slug: text(body.slug, "Slug").toLowerCase(),
    name: text(body.name, "Name", { max: 120 }),
    size: text(body.size, "Size", { max: 60 }),
    price: number(body.price, "Price"),
    eachNote: text(body.eachNote, "Each note", { required: false, max: 60 }),
    badge: text(body.badge, "Badge", { required: false, max: 30 }),
    category: text(body.category, "Category", { max: 80 }),
    type: text(body.type, "Type", { max: 80 }),
    concerns: listOfStrings(body.concerns, "Concerns"),
    short: text(body.short, "Short description", { max: 200 }),
    description: text(body.description, "Description", { max: 1200 }),
    benefits: listOfStrings(body.benefits, "Benefits"),
    ingredients: text(body.ingredients, "Ingredients", { max: 1000 }),
    howToUse: text(body.howToUse, "How to use", { max: 1000 }),
    suitableFor: text(body.suitableFor, "Suitable for", { required: false, max: 200 }),
    image: text(body.image, "Image", { max: 300 }),
    gallery: listOfStrings(body.gallery, "Gallery", 12),
    inStock: body.inStock === undefined ? undefined : Boolean(body.inStock),
    featured: body.featured === undefined ? undefined : Boolean(body.featured),
  };

  const updated = { ...existing, ...fields };
  for (const key of Object.keys(updated)) if (updated[key] === undefined) delete updated[key];
  if (!SLUG_RX.test(updated.slug)) throw new Error("Slug can only contain lowercase letters, numbers and dashes");
  updated.concerns = updated.concerns ?? [];
  updated.benefits = updated.benefits ?? [];
  updated.gallery = updated.gallery ?? [];
  return updated;
}

export async function listProducts(req, res) {
  const { category, type, concern, q, featured, inStock } = req.query;
  const filter = {};

  const categories = parseList(category);
  if (categories.length) filter.category = { $in: categories };

  const types = parseList(type);
  if (types.length) filter.type = { $in: types };

  const concerns = parseList(concern);
  if (concerns.length) filter.concerns = { $in: concerns };

  if (featured === "true") filter.featured = true;
  if (inStock === "true") filter.inStock = true;

  let query = Product.find(filter);
  if (typeof q === "string" && q.trim()) {
    const safeQuery = q.trim().slice(0, 100);
    const rx = new RegExp(safeQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query = query.or([{ name: rx }, { short: rx }, { category: rx }, { type: rx }]);
  }

  const products = await query.sort({ featured: -1, createdAt: 1 }).lean();
  res.json(products);
}

export async function getProduct(req, res) {
  const product = await Product.findOne({ slug: req.params.slug.toLowerCase() }).lean();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}

export async function listFacets(req, res) {
  const [categories, types, concerns] = await Promise.all([
    Product.distinct("category"),
    Product.distinct("type"),
    Product.distinct("concerns"),
  ]);
  res.json({ categories: categories.sort(), types: types.sort(), concerns: concerns.sort() });
}

export async function createProduct(req, res) {
  try {
    const data = parseProduct(req.body);
    const existing = await Product.findOne({ slug: data.slug }).lean();
    if (existing) return res.status(409).json({ error: `A product with slug "${data.slug}" already exists` });
    const product = await Product.create(data);
    res.status(201).json(product.toObject());
  } catch (error) {
    validationError(res, error);
  }
}

export async function updateProduct(req, res) {
  try {
    const existing = await Product.findOne({ slug: req.params.slug.toLowerCase() }).lean();
    if (!existing) return res.status(404).json({ error: "Product not found" });
    const merged = { ...existing, ...req.body, slug: bodySlug(req.body) ?? existing.slug };
    const data = parseProduct(merged, existing);
    if (data.slug !== existing.slug) {
      const clash = await Product.findOne({ slug: data.slug, _id: { $ne: existing._id } }).lean();
      if (clash) return res.status(409).json({ error: `A product with slug "${data.slug}" already exists` });
    }
    const product = await Product.findOneAndUpdate({ _id: existing._id }, { $set: data }, { new: true }).lean();
    res.json(product);
  } catch (error) {
    validationError(res, error);
  }
}

function bodySlug(body) {
  return typeof body?.slug === "string" && body.slug.trim() ? body.slug.trim() : undefined;
}

export async function deleteProduct(req, res) {
  const product = await Product.findOneAndDelete({ slug: req.params.slug.toLowerCase() }).lean();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ ok: true });
}
