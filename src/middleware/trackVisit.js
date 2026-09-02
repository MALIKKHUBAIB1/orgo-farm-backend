import { Visit } from "../models/Visit.js";
import { clientIp, parseUserAgent } from "../utils/visitHelpers.js";

const EXCLUDE_PATHS = ["/api", "/admin", "/_next", "/favicon", "/robots.txt", "/sitemap", "/icon", "/apple", "/manifest"];

export function trackVisit(req, res, next) {
  const start = process.hrtime.bigint();
  const path = req.path || "/";
  if (EXCLUDE_PATHS.some((p) => path.startsWith(p))) return next();
  res.on("finish", () => {
    try {
      const tookMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
      const ip = clientIp(req);
      const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
      const visit = new Visit({
        ip,
        path,
        method: req.method,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 250),
        browser,
        os,
        device,
        referrer: String(req.headers["referer"] || req.headers["referrer"] || "").slice(0, 250),
        took: tookMs,
      });
      visit.save().catch(() => {});
    } catch {
      /* never block a page for analytics */
    }
  });
  next();
}