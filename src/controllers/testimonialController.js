import { Testimonial } from "../models/Testimonial.js";

export async function getTestimonials(_req, res) {
  try {
    const testimonials = await Testimonial.find({ visible: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(12)
      .lean();
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const OBJECT_ID_RX = /^[0-9a-f]{24}$/i;
const TEXT_RX = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

export function testimonialFields(body, { partial = false } = {}) {
  const fields = {};
  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 60 || !TEXT_RX.test(name))
      throw new Error("Name is required and must be 60 characters or fewer");
    fields.name = name;
  }
  if (!partial || body.quote !== undefined) {
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    if (!quote || quote.length > 500 || !TEXT_RX.test(quote))
      throw new Error("Review text is required and must be 500 characters or fewer");
    fields.quote = quote;
  }
  if (!partial || body.product !== undefined) {
    const product = typeof body.product === "string" ? body.product.trim() : "";
    if (product.length > 80 || !TEXT_RX.test(product))
      throw new Error("Product must be 80 characters or fewer");
    fields.product = product;
  }
  if (!partial || body.rating !== undefined) {
    const rating = Number(body.rating ?? 5);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
    fields.rating = rating;
  }
  if (!partial || body.avatar !== undefined) {
    const avatar = typeof body.avatar === "string" ? body.avatar.trim() : "";
    if (avatar.length > 500) throw new Error("Avatar URL is too long");
    fields.avatar = avatar;
  }
  if (!partial || body.sortOrder !== undefined) {
    const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000)
      throw new Error("Sort order must be a whole number");
    fields.sortOrder = sortOrder;
  }
  if (!partial || body.visible !== undefined) {
    fields.visible = Boolean(body.visible);
  }
  return fields;
}

export async function adminCreateTestimonial(req, res) {
  try {
    const testimonial = await Testimonial.create(testimonialFields(req.body ?? {}));
    res.status(201).json(testimonial.toObject());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function adminUpdateTestimonial(req, res) {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid testimonial" });
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { $set: testimonialFields(req.body ?? {}, { partial: true }) },
      { new: true },
    ).lean();
    if (!testimonial) return res.status(404).json({ error: "Testimonial not found" });
    res.json(testimonial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function adminDeleteTestimonial(req, res) {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid testimonial" });
  const testimonial = await Testimonial.findByIdAndDelete(req.params.id).lean();
  if (!testimonial) return res.status(404).json({ error: "Testimonial not found" });
  res.json({ ok: true });
}