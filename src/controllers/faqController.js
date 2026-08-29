import { Faq } from "../models/Faq.js";

export async function listFaqs(req, res) {
  const faqs = await Faq.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.json(faqs);
}