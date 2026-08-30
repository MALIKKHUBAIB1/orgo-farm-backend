import crypto from "node:crypto";

const SAFE_TEXT = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADMIN_HEADER = "x-admin-api-key";

function getAllowedOrigins() {
  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://www.weorgofarm.in",
    "https://weorgofarm.in",
    "https://orgo-farm.vercel.app",
  ];
  const extra = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...new Set([...defaults, ...extra])];
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "vercel.app" || host.endsWith(".vercel.app") || host.endsWith(".onrender.com");
  } catch {
    return false;
  }
}

function text(value, label, { min = 1, max }) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max || !SAFE_TEXT.test(normalized))
    throw new Error(`${label} is invalid`);
  return normalized;
}

export function validationError(res, error) {
  return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
}

export function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  if (process.env.NODE_ENV === "production")
    res.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  next();
}

export function configureCors(req, res, next) {
  const origin = req.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (origin && !isOriginAllowed(origin))
    return res.status(403).json({ error: "Origin is not allowed" });

  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set({
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Api-Key",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

export function rejectUnsafeKeys(req, res, next) {
  const unsafe = (value) => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, child]) => key.startsWith("$") || key.includes(".") || unsafe(child));
  };
  if (unsafe(req.query) || unsafe(req.params) || unsafe(req.body))
    return res.status(400).json({ error: "Unsafe request data" });
  next();
}

export function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();
  let lastSweep = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
      lastSweep = now;
    }

    const key = req.ip || req.socket.remoteAddress || "unknown";
    const entry = hits.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    hits.set(key, current);

    const remaining = Math.max(0, max - current.count);
    res.set({
      "RateLimit-Limit": String(max),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
    });
    if (current.count > max) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export function createLoginLimiter({ maxAttempts = 10, windowMs = 15 * 60 * 1000, message }) {
  const attempts = new Map();
  let lastSweep = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
      lastSweep = now;
    }

    const email = String(req.body?.email ?? "").toLowerCase().slice(0, 100) || "none";
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${email}`;
    const entry = attempts.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    attempts.set(key, current);

    if (current.count > maxAttempts) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: message || "Too many attempts. Try again later." });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = req.get(ADMIN_HEADER);
  if (!expected) return res.status(503).json({ error: "Admin access is not configured" });
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied || "");
  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer))
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function parseContact(body) {
  const name = text(body?.name, "Name", { max: 100 });
  const message = text(body?.message, "Message", { max: 2000 });
  const email = text(body?.email, "Email", { max: 254 }).toLowerCase();
  const phone = body?.phone ? text(body.phone, "Phone", { max: 30 }) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email is invalid");
  if (phone && !/^[+0-9()\-\s]{7,30}$/.test(phone)) throw new Error("Phone is invalid");
  return { name, email, phone, message };
}

export function parseOrder(body) {
  if (!Array.isArray(body?.lines) || body.lines.length < 1 || body.lines.length > 20)
    throw new Error("Cart must contain 1 to 20 items");
  const lines = body.lines.map((line) => {
    const slug = typeof line?.slug === "string" ? line.slug.toLowerCase() : "";
    const qty = Number(line?.qty);
    if (!SLUG.test(slug) || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error("Cart contains an invalid item");
    return { slug, qty };
  });
  if (new Set(lines.map((line) => line.slug)).size !== lines.length) throw new Error("Cart contains duplicate items");
  const customer = body.customer || {};
  const address = body.address || {};
  const parsedCustomer = {
    name: text(customer.name, "Name", { max: 100 }),
    email: text(customer.email, "Email", { max: 254 }).toLowerCase(),
    phone: text(customer.phone, "Phone", { max: 30 }),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedCustomer.email)) throw new Error("Email is invalid");
  if (!/^[+0-9()\-\s]{7,30}$/.test(parsedCustomer.phone)) throw new Error("Phone is invalid");
  const parsedAddress = {
    address: text(address.address, "Address", { max: 250 }),
    city: text(address.city, "City", { max: 80 }),
    state: text(address.state, "State", { max: 80 }),
    pin: text(address.pin, "PIN code", { max: 20 }),
  };
  if (!/^[0-9A-Za-z\-\s]{4,20}$/.test(parsedAddress.pin)) throw new Error("PIN code is invalid");
  if (!["standard", "fast"].includes(body.shipping ?? "standard")) throw new Error("Invalid shipping option");
  const payment = text(body.payment, "Payment method", { max: 50 });
  if (!["UPI", "Credit / Debit Card", "Net Banking", "Wallets", "Cash on Delivery"].includes(payment))
    throw new Error("Invalid payment method");
  return { lines, customer: parsedCustomer, address: parsedAddress, shipping: body.shipping ?? "standard", payment };
}

export function validateShopKey(req, res, next) {
  if (!UUID.test(req.params.key)) return res.status(400).json({ error: "Invalid cart session" });
  next();
}

export function parseShopOp(body) {
  const op = body?.op;
  if (!["add", "setQty", "remove", "clearCart", "toggleWishlist", "removeWishlist"].includes(op))
    throw new Error("Unknown cart operation");
  if (op === "clearCart") return { op };
  const slug = typeof body?.slug === "string" ? body.slug.toLowerCase() : "";
  if (!SLUG.test(slug)) throw new Error("Invalid product");
  if (op === "add" || op === "setQty") {
    const qty = Number(body.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error("Quantity must be between 1 and 20");
    return { op, slug, qty };
  }
  return { op, slug };
}
