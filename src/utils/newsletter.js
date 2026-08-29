import { Product } from "../models/Product.js";
import { Subscription } from "../models/Subscription.js";
import { NewsletterReport } from "../models/NewsletterReport.js";
import { sendNewProductsEmail } from "./newsletterEmail.js";

const CRON_INTERVAL_MS = process.env.NEWSLETTER_CRON_MINUTES
  ? Number(process.env.NEWSLETTER_CRON_MINUTES) * 60 * 1000
  : 5 * 60 * 1000;

export async function markBaselineNotified() {
  const { modifiedCount } = await Product.updateMany(
    { notifiedAt: null },
    { $set: { notifiedAt: new Date() } },
  );
  if (modifiedCount > 0) console.log(`[newsletter] baseline stamped ${modifiedCount} existing product(s)`);
}

export async function runNewsletterCron() {
  const products = await Product.find({ notifiedAt: null })
    .sort({ createdAt: 1 })
    .limit(12)
    .lean();

  if (products.length === 0) return { status: "no-products", sentTo: 0 };

  const subscribers = await Subscription.find({ active: true }).lean();
  if (subscribers.length === 0) {
    await Product.updateMany(
      { _id: { $in: products.map((p) => p._id) } },
      { $set: { notifiedAt: new Date() } },
    );
    await NewsletterReport.create({
      productNames: products.map((p) => p.name),
      productSlugs: products.map((p) => p.slug),
      subject: "New arrivals at ORGO FARM",
      sentTo: 0,
      status: "no-subscribers",
    });
    return { status: "no-subscribers", sentTo: 0, products: products.map((p) => p.name) };
  }

  const payload = products.map((p) => ({
    name: p.name,
    price: p.price,
    image: p.image,
    slug: p.slug,
    short: p.short,
  }));

  let sentTo = 0;
  let failed = 0;
  for (const sub of subscribers) {
    try {
      await sendNewProductsEmail({ to: sub.email, products: payload });
      sentTo += 1;
    } catch (error) {
      failed += 1;
      console.error(`[newsletter] failed for ${sub.email}:`, error.message);
    }
  }

  await Product.updateMany(
    { _id: { $in: products.map((p) => p._id) } },
    { $set: { notifiedAt: new Date() } },
  );
  await NewsletterReport.create({
    productNames: products.map((p) => p.name),
    productSlugs: products.map((p) => p.slug),
    subject: "New arrivals at ORGO FARM",
    sentTo,
    failed,
    status: "sent",
  });

  return { status: "sent", sentTo, failed, products: products.map((p) => p.name) };
}

export function startNewsletterCron() {
  const run = () =>
    runNewsletterCron()
      .then((result) => console.log("[newsletter] cron →", JSON.stringify(result)))
      .catch((error) => console.error("[newsletter] cron error:", error.message));

  const timer = setInterval(run, CRON_INTERVAL_MS);
  timer.unref?.();
  console.log(`[newsletter] cron started — every ${CRON_INTERVAL_MS / 60000} min`);
  return timer;
}