import { Visit } from "../models/Visit.js";
import { clientIp, normalizeIp, parseUserAgent, isHealthCheck } from "../utils/visitHelpers.js";

// NOTE: the storefront (Next.js) runs on a different origin, so real pageviews
// arrive via POST /api/visits (see visitRoutes.js). This middleware only sees
// backend hits — /api/* are API calls, not pageviews, so they stay excluded
// (otherwise one page load would log 3-4 "visits"). Never remove the
// "/api/visits" exclusion or every beacon would be double-counted.
const EXCLUDE_PATHS = ["/api", "/admin", "/_next", "/favicon", "/robots.txt", "/sitemap", "/icon", "/apple", "/manifest", "/api/visits"];

export function trackVisit(req, res, next) {
  const start = process.hrtime.bigint();
  const path = req.path || "/";
  if (EXCLUDE_PATHS.some((p) => path.startsWith(p))) return next();
  res.on("finish", () => {
    try {
      const ua = String(req.headers["user-agent"] || "");
      // Infra health-checkers (GoogleHC, kube-probe, uptime monitors) are
      // not visitors — skip them so the dashboard stays clean.
      if (isHealthCheck(ua)) return;
      const tookMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
      const ip = normalizeIp(clientIp(req));
      const { browser, os, device } = parseUserAgent(ua);
      const visit = new Visit({
        ip,
        path,
        method: req.method,
        userAgent: ua.slice(0, 250),
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