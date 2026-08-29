import { Faq } from "../models/Faq.js";

export const DEFAULT_FAQS = [
  ["How do I place an order?", "Add products to your cart and check out on the website, or tap Order on WhatsApp on any product page to place your order directly with us."],
  ["Do you ship across India?", "Yes, we ship to all serviceable PIN codes across India."],
  ["Is standard shipping free?", "Yes — standard shipping is free across India on every order."],
  ["What is fast delivery?", "Fast delivery is a priority dispatch option available at ₹100 at checkout."],
  ["How do I use the Face Pack?", "Mix the powder with water or rose water into a smooth paste, apply an even layer, leave for 8–10 minutes, gently scrub and rinse. See our How To Use page for all six steps."],
  ["How often should I use the Face Pack?", "We recommend 2–3 times a week for best results."],
  ["Are the products handmade?", "Yes. Every ORGO FARM product is handcrafted in small batches."],
  ["Are the products free from parabens?", "Yes. Our formulations are made without parabens."],
  ["Do you use artificial fragrances?", "No. We use natural ingredients only — no artificial fragrances."],
  ["How can I track my order?", "Use the Track Order section in your account, or message us on WhatsApp with your order ID."],
  ["What is your return policy?", "Unopened products can be returned within 7 days of delivery. Contact us and we'll help."],
];

export async function ensureFaqs() {
  const count = await Faq.countDocuments();
  if (count > 0) return;
  await Faq.insertMany(DEFAULT_FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i })));
  console.log(`[faq] seeded ${DEFAULT_FAQS.length} default FAQs`);
}