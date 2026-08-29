import { Router } from "express";
import { ContactMessage } from "../models/ContactMessage.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Curation } from "../models/Curation.js";
import { User } from "../models/User.js";
import { Subscription } from "../models/Subscription.js";
import { NewsletterReport } from "../models/NewsletterReport.js";
import { Faq } from "../models/Faq.js";
import { InstaPost } from "../models/InstaPost.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { validationError } from "../middleware/security.js";
import { runNewsletterCron } from "../utils/newsletter.js";

const router = Router();

router.use(requireAdminUser);

const OBJECT_ID_RX = /^[0-9a-f]{24}$/i;

router.get("/stats", async (req, res) => {
  try {
    const [users, products, curations, messages, unread, ordersAgg, subscribers, broadcasts] =
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Curation.countDocuments(),
        ContactMessage.countDocuments(),
        ContactMessage.countDocuments({ read: false }),
        Order.aggregate([{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } }]),
        Subscription.countDocuments({ active: true }),
        NewsletterReport.countDocuments(),
      ]);
    res.json({
      users,
      products,
      curations,
      messages,
      unread,
      orders: ordersAgg[0]?.count ?? 0,
      revenue: ordersAgg[0]?.total ?? 0,
      subscribers,
      broadcasts,
    });
  } catch (error) {
    validationError(res, error);
  }
});

router.get("/messages", async (req, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(messages);
});

router.patch("/messages/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid message" });
  const read = Boolean(req.body?.read);
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { read } }, { new: true }).lean();
  if (!message) return res.status(404).json({ error: "Message not found" });
  res.json(message);
});

router.delete("/messages/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid message" });
  const message = await ContactMessage.findByIdAndDelete(req.params.id).lean();
  if (!message) return res.status(404).json({ error: "Message not found" });
  res.json({ ok: true });
});

router.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(10).select("id customer total status createdAt lines").lean();
  res.json(orders);
});

router.get("/subscriptions", async (req, res) => {
  const subscriptions = await Subscription.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(subscriptions);
});

router.patch("/subscriptions/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid subscription" });
  const sub = await Subscription.findByIdAndUpdate(
    req.params.id,
    { $set: { active: Boolean(req.body?.active) } },
    { new: true },
  ).lean();
  if (!sub) return res.status(404).json({ error: "Subscription not found" });
  res.json(sub);
});

router.delete("/subscriptions/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid subscription" });
  const sub = await Subscription.findByIdAndDelete(req.params.id).lean();
  if (!sub) return res.status(404).json({ error: "Subscription not found" });
  res.json({ ok: true });
});

router.get("/newsletter/reports", async (req, res) => {
  const reports = await NewsletterReport.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json(reports);
});

router.post("/newsletter/run", async (req, res) => {
  try {
    const result = await runNewsletterCron();
    res.json({ ok: true, ...result });
  } catch (error) {
    validationError(res, error);
  }
});

const FAQ_TEXT_RX = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

function faqFields(body, { partial = false } = {}) {
  const fields = {};
  if (!partial || body.question !== undefined) {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 300 || !FAQ_TEXT_RX.test(question))
      throw new Error("Question is required and must be 300 characters or fewer");
    fields.question = question;
  }
  if (!partial || body.answer !== undefined) {
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!answer || answer.length > 2000 || !FAQ_TEXT_RX.test(answer))
      throw new Error("Answer is required and must be 2000 characters or fewer");
    fields.answer = answer;
  }
  if (!partial || body.sortOrder !== undefined) {
    const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000)
      throw new Error("Sort order must be a whole number");
    fields.sortOrder = sortOrder;
  }
  return fields;
}

router.post("/faqs", async (req, res) => {
  try {
    const faq = await Faq.create(faqFields(req.body));
    res.status(201).json(faq.toObject());
  } catch (error) {
    validationError(res, error);
  }
});

router.patch("/faqs/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid FAQ" });
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, { $set: faqFields(req.body, { partial: true }) }, { new: true }).lean();
    if (!faq) return res.status(404).json({ error: "FAQ not found" });
    res.json(faq);
  } catch (error) {
    validationError(res, error);
  }
});

router.delete("/faqs/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid FAQ" });
  const faq = await Faq.findByIdAndDelete(req.params.id).lean();
  if (!faq) return res.status(404).json({ error: "FAQ not found" });
  res.json({ ok: true });
});

router.post("/instagram", async (req, res) => {
  try {
    const exists = await InstaPost.findOne({ code: String(req.body?.code ?? "").trim() }).lean();
    if (exists) return res.status(409).json({ error: "A post with this code already exists" });
    const post = await InstaPost.create(instaFields(req.body));
    res.status(201).json(post.toObject());
  } catch (error) {
    validationError(res, error);
  }
});

router.patch("/instagram/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid post" });
  try {
    const body = instaFields(req.body, { partial: true });
    if (body.code) {
      const clash = await InstaPost.findOne({ code: body.code, _id: { $ne: req.params.id } }).lean();
      if (clash) return res.status(409).json({ error: "A post with this code already exists" });
    }
    const post = await InstaPost.findByIdAndUpdate(req.params.id, { $set: body }, { new: true }).lean();
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (error) {
    validationError(res, error);
  }
});

router.delete("/instagram/:id", async (req, res) => {
  if (!OBJECT_ID_RX.test(req.params.id)) return res.status(400).json({ error: "Invalid post" });
  const post = await InstaPost.findByIdAndDelete(req.params.id).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ ok: true });
});

const INSTA_CODE_RX = /^[A-Za-z0-9_-]{4,20}$/;

function instaFields(body, { partial = false } = {}) {
  const fields = {};
  if (!partial || body.code !== undefined) {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!INSTA_CODE_RX.test(code)) throw new Error("Code must be 4–20 characters (letters, numbers, dashes, underscores)");
    fields.code = code;
  }
  if (!partial || body.kind !== undefined) {
    const kind = body.kind;
    if (kind !== "reel" && kind !== "p") throw new Error("Kind must be reel or p");
    fields.kind = kind;
  }
  if (!partial || body.alt !== undefined) {
    const alt = typeof body.alt === "string" ? body.alt.trim() : "";
    if (!alt || alt.length > 200) throw new Error("Label is required and must be 200 characters or fewer");
    fields.alt = alt;
  }
  if (!partial || body.sortOrder !== undefined) {
    const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000)
      throw new Error("Sort order must be a whole number");
    fields.sortOrder = sortOrder;
  }
  return fields;
}

export default router;