import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import productRoutes from "./routes/productRoutes.js";
import curationRoutes from "./routes/curationRoutes.js";
import shopSettingsRoutes from "./routes/shopSettingsRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import heroSettingsRoutes from "./routes/heroSettingsRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import instagramRoutes from "./routes/instagramRoutes.js";
import { runNewsletterCron } from "./utils/newsletter.js";
import { trackVisit } from "./middleware/trackVisit.js";
import { configureCors, createRateLimiter, rejectUnsafeKeys, securityHeaders } from "./middleware/security.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(configureCors);
  app.use(trackVisit);
  app.use(express.static(PUBLIC_DIR, { fallthrough: true, maxAge: "30d", immutable: true, index: false }));
  app.use(express.json({ limit: "16kb", strict: true, type: "application/json" }));
  app.use(rejectUnsafeKeys);
  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300, message: "Too many requests. Try again later." }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.get("/api/cron/newsletter", async (req, res) => {
    const secret = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
      return res.status(403).json({ error: "Forbidden" });
    try {
      const result = await runNewsletterCron();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use("/api/products", productRoutes);
  app.use("/api/curations", curationRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/shop-settings", shopSettingsRoutes);
  app.use("/api/shop", shopRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin/auth", adminAuthRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/faqs", faqRoutes);
  app.use("/api/instagram", instagramRoutes);
  app.use("/api/testimonials", testimonialRoutes);
  app.use("/api/hero-settings", heroSettingsRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err, req, res, _next) => {
    console.error("[error]", err.message);
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON body" });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request body is too large" });
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
