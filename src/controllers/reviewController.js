import { Review } from "../models/Review.js";
import { validationError } from "../middleware/security.js";

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_TEXT_RX = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

function cleanSlug(value) {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!SLUG_RX.test(slug)) throw new Error("Invalid product");
  return slug;
}

function cleanText(value, label, { required = true, max = 500 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} is required`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max || !SAFE_TEXT_RX.test(normalized))
    throw new Error(`${label} is invalid`);
  return normalized;
}

function reviewFields(body) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5 stars");
  return {
    name: cleanText(body?.name, "Name", { max: 60 }),
    rating,
    title: cleanText(body?.title, "Title", { required: false, max: 120 }),
    comment: cleanText(body?.comment, "Review", { max: 1000 }),
  };
}

function publicShape(r) {
  return {
    id: String(r._id),
    name: r.name,
    rating: r.rating,
    title: r.title || "",
    comment: r.comment,
    createdAt: r.createdAt,
  };
}

// GET /api/reviews/:slug — approved reviews for one product, newest first.
export async function listReviews(req, res) {
  const productSlug = cleanSlug(req.params.slug);
  const reviews = await Review.find({ productSlug, approved: true })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(reviews.map(publicShape));
}

// POST /api/reviews/:slug — submit a review (rate-limited at the route).
export async function createReview(req, res) {
  try {
    const productSlug = cleanSlug(req.params.slug);
    const review = await Review.create({ productSlug, ...reviewFields(req.body) });
    res.status(201).json(publicShape(review.toObject()));
  } catch (error) {
    validationError(res, error);
  }
}

// Admin: GET /api/admin/reviews — everything, newest first.
export async function adminListReviews(req, res) {
  const reviews = await Review.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(
    reviews.map((r) => ({
      ...publicShape(r),
      productSlug: r.productSlug,
      approved: r.approved,
    })),
  );
}

// Admin: DELETE /api/admin/reviews/:id — remove a review (spam/abuse).
export async function adminDeleteReview(req, res) {
  if (!/^[0-9a-f]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid review" });
  const review = await Review.findByIdAndDelete(req.params.id).lean();
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json({ ok: true });
}
