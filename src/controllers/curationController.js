import { Curation } from "../models/Curation.js";
import { validationError } from "../middleware/security.js";

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIERS = ["Bronze", "Silver", "Gold"];

function text(value, label, { required = true, max = 200 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized;
}

function itemList(value) {
  if (!Array.isArray(value)) throw new Error("Items must be a list");
  const items = value.map((s) => text(String(s), "Item", { max: 120 })).filter(Boolean);
  if (!items.length) throw new Error("Items must contain at least one item");
  if (items.length > 20) throw new Error("Too many items");
  return items;
}

export async function listCurations(req, res) {
  const tiers = ["Bronze", "Silver", "Gold"];
  const curations = await Curation.find().lean();
  curations.sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier));
  res.json(curations);
}

export function parseCuration(body, existing = {}) {
  let tier = text(body.tier, "Tier");
  if (!TIERS.includes(tier)) throw new Error("Tier must be Bronze, Silver or Gold");
  const data = {
    slug: text(body.slug, "Slug").toLowerCase(),
    tier,
    title: text(body.title, "Title", { max: 120 }),
    label: text(body.label, "Label", { max: 60 }),
    items: itemList(body.items),
    price: Number(body.price),
    cta: text(body.cta, "CTA", { max: 60 }),
  };
  if (!Number.isFinite(data.price) || data.price < 0 || data.price > 1000000)
    throw new Error("Price must be a valid number");
  data.price = Math.round(data.price * 100) / 100;
  if (!SLUG_RX.test(data.slug)) throw new Error("Slug can only contain lowercase letters, numbers and dashes");
  return { ...existing, ...data };
}

export async function createCuration(req, res) {
  try {
    const data = parseCuration(req.body);
    const existing = await Curation.findOne({ slug: data.slug }).lean();
    if (existing) return res.status(409).json({ error: `A curation with slug "${data.slug}" already exists` });
    const curation = await Curation.create(data);
    res.status(201).json(curation.toObject());
  } catch (error) {
    validationError(res, error);
  }
}

export async function updateCuration(req, res) {
  try {
    const existing = await Curation.findOne({ slug: req.params.slug.toLowerCase() }).lean();
    if (!existing) return res.status(404).json({ error: "Curation not found" });
    const merged = {
      ...existing,
      ...req.body,
      slug: typeof req.body?.slug === "string" && req.body.slug.trim() ? req.body.slug.trim() : existing.slug,
    };
    const data = parseCuration(merged, existing);
    if (data.slug !== existing.slug) {
      const clash = await Curation.findOne({ slug: data.slug, _id: { $ne: existing._id } }).lean();
      if (clash) return res.status(409).json({ error: `A curation with slug "${data.slug}" already exists` });
    }
    const curation = await Curation.findOneAndUpdate({ _id: existing._id }, { $set: data }, { new: true }).lean();
    res.json(curation);
  } catch (error) {
    validationError(res, error);
  }
}

export async function deleteCuration(req, res) {
  const curation = await Curation.findOneAndDelete({ slug: req.params.slug.toLowerCase() }).lean();
  if (!curation) return res.status(404).json({ error: "Curation not found" });
  res.json({ ok: true });
}