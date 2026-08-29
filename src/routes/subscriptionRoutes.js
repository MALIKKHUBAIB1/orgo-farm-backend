import { Router } from "express";
import { Subscription } from "../models/Subscription.js";
import { createRateLimiter, validationError } from "../middleware/security.js";

const router = Router();

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const subscribeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: "Too many subscription requests. Try again later.",
});
const unsubscribeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many requests. Try again later.",
});

router.post("/", subscribeLimiter, async (req, res) => {
  try {
    const raw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (raw.length > 254 || !EMAIL_RX.test(raw))
      return res.status(400).json({ error: "Please enter a valid email address" });

    const existing = await Subscription.findOne({ email: raw }).lean();
    if (existing) {
      if (!existing.active) await Subscription.updateOne({ _id: existing._id }, { $set: { active: true } });
      return res.json({ ok: true, subscribed: true });
    }

    await Subscription.create({ email: raw });
    res.status(201).json({ ok: true, subscribed: true });
  } catch (error) {
    if (error?.code === 11000) return res.json({ ok: true, subscribed: true });
    validationError(res, error);
  }
});

router.post("/unsubscribe", unsubscribeLimiter, async (req, res) => {
  const raw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!raw) return res.status(400).json({ error: "Email is required" });
  await Subscription.updateOne({ email: raw }, { $set: { active: false } });
  res.json({ ok: true });
});

export default router;