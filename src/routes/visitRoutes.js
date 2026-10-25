import { Router } from "express";
import { Visit } from "../models/Visit.js";
import { createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";
import {
  clientIp,
  normalizeIp,
  parseUserAgent,
  isHealthCheck,
  geoFromHeaders,
  countryFromTimezone,
} from "../utils/visitHelpers.js";

const router = Router();

// Generous limit: 1 pageview per few seconds per IP is normal (SPA navigation
// fires one beacon per route change). 300 / 15min matches the global limiter.
const trackLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests. Try again later.",
});

const PATH_RX = /^\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;

router.post("/", trackLimiter, ah(async (req, res) => {
  try {
    const ua = String(req.headers["user-agent"] || "");
    // Server monitors / curl with no browser UA are not visitors.
    if (isHealthCheck(ua)) return res.status(204).end();

    let path = typeof req.body?.path === "string" ? req.body.path.trim() : "/";
    if (!path.startsWith("/")) path = `/${path}`;
    // Strip query/hash length abuse, keep it readable for the admin UI.
    path = path.slice(0, 250);
    if (!PATH_RX.test(path)) path = "/";

    const referrer =
      typeof req.body?.referrer === "string"
        ? req.body.referrer.slice(0, 250)
        : String(req.headers["referer"] || req.headers["referrer"] || "").slice(0, 250);

    const timezone = typeof req.body?.timezone === "string" ? req.body.timezone.slice(0, 80) : "";
    const language = typeof req.body?.language === "string" ? req.body.language.slice(0, 20) : "";

    const ip = normalizeIp(clientIp(req));
    const { browser, os, device } = parseUserAgent(ua);
    // Geo headers only exist behind proxies like Cloudflare/Vercel;
    // otherwise the browser timezone is our location signal.
    const geo = geoFromHeaders(req.headers);

    await Visit.create({
      ip,
      path,
      method: "GET",
      userAgent: ua.slice(0, 250),
      browser,
      os,
      device,
      referrer,
      city: geo.city,
      country: geo.country || countryFromTimezone(timezone),
      timezone,
      language,
      took: 0,
    });

    res.status(201).json({ ok: true });
  } catch {
    // Never break the storefront for analytics.
    res.json({ ok: true });
  }
}));

export default router;
