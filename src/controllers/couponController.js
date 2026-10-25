import { Coupon } from "../models/Coupon.js";

export function couponIsAvailable(coupon, now) {
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt) : null;
  if (startsAt && startsAt > now) return false;
  if (endsAt) {
    // Older admin saves stored an end date at midnight; keep that calendar day inclusive.
    if (
      endsAt.getUTCHours() === 0 &&
      endsAt.getUTCMinutes() === 0 &&
      endsAt.getUTCSeconds() === 0 &&
      endsAt.getUTCMilliseconds() === 0
    ) {
      endsAt.setUTCHours(23, 59, 59, 999);
    }
    if (endsAt < now) return false;
  }
  return true;
}

// Public: only coupons that are active and inside their schedule window.
export async function listActiveCoupons(_req, res) {
  try {
    const now = new Date();
    const rows = await Coupon.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();
    const coupons = rows.filter((coupon) => couponIsAvailable(coupon, now)).slice(0, 6);
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const OBJECT_ID_RX = /^[0-9a-f]{24}$/i;
const CODE_RX = /^[A-Za-z0-9_-]{3,24}$/;
const TYPES = new Set(["percent", "fixed", "shipping"]);

export class CouponError extends Error {}

function num(v, label, fallback) {
  if (v === undefined && fallback !== undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number`);
  return n;
}

function cleanText(s) {
  return typeof s === "string" ? s.replace(/[<>]/g, "").trim() : "";
}

export function couponFields(body, { partial = false } = {}) {
  const fields = {};

  if (!partial || body.code !== undefined) {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!CODE_RX.test(code)) throw new Error("Code must be 3-24 letters, numbers, - or _");
    fields.code = code;
  }
  if (!partial || body.message !== undefined) {
    const message = cleanText(body.message);
    if (!message || message.length > 80) throw new Error("Message is required and must be 80 characters or fewer");
    fields.message = message;
  }
  if (!partial || body.type !== undefined) {
    const type = typeof body.type === "string" ? body.type : "percent";
    if (!TYPES.has(type)) throw new Error("Type must be percent, fixed or shipping");
    fields.type = type;
  }
  if (!partial || body.value !== undefined) {
    const value = num(body.value, "Value", body.type === "shipping" ? 0 : undefined);
    if (value < 0 || value > 100000) throw new Error("Value must be between 0 and 100000");
    const type = fields.type ?? body.type;
    if (type === "percent" && (value <= 0 || value > 100))
      throw new Error("Percent value must be greater than 0 and cannot exceed 100");
    if (type === "fixed" && value <= 0) throw new Error("Fixed discount must be greater than 0");
    fields.value = Math.round(value * 100) / 100;
  }
  if (!partial || body.minOrder !== undefined) {
    const minOrder = num(body.minOrder, "Minimum order", 0);
    if (minOrder < 0) throw new Error("Minimum order cannot be negative");
    fields.minOrder = Math.round(minOrder);
  }
  if (!partial || body.maxDiscount !== undefined) {
    const maxDiscount = num(body.maxDiscount, "Max discount", 0);
    if (maxDiscount < 0) throw new Error("Max discount cannot be negative");
    if ((fields.type ?? body.type) === "percent" && maxDiscount > 0 && maxDiscount < 1)
      throw new Error("Max discount must be at least ₹1");
    fields.maxDiscount = Math.round(maxDiscount);
  }
  if (!partial || body.active !== undefined) fields.active = Boolean(body.active);
  if (!partial || body.startsAt !== undefined) {
    fields.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (fields.startsAt && Number.isNaN(fields.startsAt.getTime())) throw new Error("Invalid start date");
  }
  if (!partial || body.endsAt !== undefined) {
    fields.endsAt = body.endsAt
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(body.endsAt) ? `${body.endsAt}T23:59:59.999Z` : body.endsAt)
      : null;
    if (fields.endsAt && Number.isNaN(fields.endsAt.getTime())) throw new Error("Invalid end date");
  }

  if (
    (fields.startsAt || fields.endsAt) &&
    fields.startsAt !== undefined &&
    fields.endsAt !== undefined &&
    fields.startsAt &&
    fields.endsAt &&
    fields.startsAt >= fields.endsAt
  )
    throw new Error("End date must be after start date");

  return fields;
}

export async function findUsableCoupon(code, now = new Date()) {
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!CODE_RX.test(normalized)) throw new CouponError("Enter a valid coupon code");
  const coupon = await Coupon.findOne({ code: normalized, active: true }).lean();
  if (!coupon || !couponIsAvailable(coupon, now))
    throw new CouponError("This coupon is invalid, inactive or expired");
  return coupon;
}

export function calculateCouponDiscount(coupon, subtotal, shippingFee) {
  if (subtotal < coupon.minOrder)
    throw new CouponError(`This coupon requires a minimum order of ₹${coupon.minOrder}`);
  if (coupon.type === "percent") {
    const discount = (subtotal * coupon.value) / 100;
    return Math.min(subtotal, coupon.maxDiscount > 0 ? Math.min(discount, coupon.maxDiscount) : discount);
  }
  if (coupon.type === "fixed") return Math.min(subtotal, coupon.value);
  return shippingFee;
}

export async function validateCoupon(req, res) {
  try {
    const subtotal = Number(req.body?.subtotal);
    const shippingFee = Number(req.body?.shippingFee ?? 0);
    if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10000000)
      return res.status(400).json({ error: "Invalid order subtotal" });
    if (!Number.isFinite(shippingFee) || shippingFee < 0 || shippingFee > 100000)
      return res.status(400).json({ error: "Invalid shipping fee" });
    const coupon = await findUsableCoupon(req.body?.code);
    const discount = calculateCouponDiscount(coupon, subtotal, shippingFee);
    res.json({ coupon, discount });
  } catch (error) {
    if (error instanceof CouponError) return res.status(400).json({ error: error.message });
    throw error;
  }
}

export async function adminListCoupons(_req, res) {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function adminCreateCoupon(req, res) {
  try {
    const coupon = await Coupon.create(couponFields(req.body ?? {}));
    res.status(201).json(coupon.toObject());
  } catch (error) {
    const status = error?.code === 11000 ? 409 : 400;
    res.status(status).json({ error: error?.code === 11000 ? "This coupon code already exists" : error.message });
  }
}

export async function adminUpdateCoupon(req, res) {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid coupon" });
  try {
    const existing = await Coupon.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Coupon not found" });
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: couponFields({ ...existing, ...(req.body ?? {}) }) },
      { new: true },
    ).lean();
    res.json(coupon);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : 400;
    res.status(status).json({ error: error?.code === 11000 ? "This coupon code already exists" : error.message });
  }
}

export async function adminDeleteCoupon(req, res) {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid coupon" });
  const coupon = await Coupon.findByIdAndDelete(req.params.id).lean();
  if (!coupon) return res.status(404).json({ error: "Coupon not found" });
  res.json({ ok: true });
}
