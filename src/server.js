import "dotenv/config";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { ensureAdmin } from "./utils/adminSetup.js";
import { markBaselineNotified, startNewsletterCron } from "./utils/newsletter.js";
import { ensureFaqs } from "./utils/faqSeed.js";

async function main() {
  // Last-resort safety net: an unexpected async error anywhere (e.g. a DB
  // blip in a timer or background task) must NEVER kill the whole API again.
  // Route handlers are wrapped with ah() so they return 500s; this only
  // catches anything that still slips through — log it and stay alive.
  process.on("unhandledRejection", (err) => {
    console.error("[unhandledRejection] server staying alive:", err?.message ?? err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] server staying alive:", err?.message ?? err);
  });

  await connectDB();
  await ensureAdmin().catch((err) => console.error("[admin] ensure failed:", err.message));
  await ensureFaqs().catch((err) => console.error("[faq] seed failed:", err.message));
  await markBaselineNotified().catch((err) => console.error("[newsletter] baseline failed:", err.message));
  const app = createApp();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`[api] listening on http://localhost:${port}`));
  startNewsletterCron();
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
