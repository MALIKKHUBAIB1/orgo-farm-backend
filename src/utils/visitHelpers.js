// Infra health-checkers (Render / Google / uptime monitors) hit the backend
// directly with no real browser UA. They are noise, not visitors.
const HEALTH_CHECK_RX =
  /googlehc|kube-probe|health[-_ ]?check|uptime|pingdom|newrelic|datadog|elb-health|amazon[- ]route|better[ -]?uptime|hetrixtools|uptimerobot|statuscake|site24x7|oh-dear|healthcheck/i;

const BOT_RX =
  /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|mediapartners-google|adsbot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider)/i;

export function isHealthCheck(ua = "") {
  return HEALTH_CHECK_RX.test(String(ua || ""));
}

export function parseUserAgent(ua = "") {
  const u = String(ua || "");
  if (!u.trim()) return { browser: "", os: "", device: "Bot" };
  if (HEALTH_CHECK_RX.test(u)) return { browser: "Health check", os: "", device: "Bot" };

  const lower = u.toLowerCase();
  let device = "Desktop";
  if (BOT_RX.test(u)) device = "Bot";
  else if (/mobile|android|iphone|ipod/i.test(lower)) device = "Mobile";
  else if (/ipad|tablet/i.test(lower)) device = "Tablet";

  let browser = "";
  if (lower.includes("samsungbrowser")) browser = "Samsung Internet";
  else if (lower.includes("edg")) browser = "Edge";
  else if (lower.includes("opr") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("firefox") || lower.includes("fxios")) browser = "Firefox";
  else if (lower.includes("crios") || lower.includes("chrome")) browser = "Chrome";
  else if (lower.includes("instagram")) browser = "Instagram";
  else if (lower.includes("fbav") || lower.includes("fban/")) browser = "Facebook";
  else if (lower.includes("safari")) browser = "Safari";
  else if (lower.includes("msie") || lower.includes("trident")) browser = "IE";
  else if (BOT_RX.test(u)) browser = "Bot";

  let os = "";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "iOS";
  else if (lower.includes("cros")) os = "ChromeOS";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  return { browser, os, device };
}

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) {
    const first = String(fwd).split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || req.ip || "";
}

// "::ffff:1.2.3.4" (Node IPv4-mapped IPv6) -> "1.2.3.4" so the dashboard
// doesn't show confusing values.
export function normalizeIp(raw = "") {
  let ip = String(raw || "").trim();
  if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice("::ffff:".length);
  return ip;
}

export function isLoopbackIp(ip = "") {
  const v = normalizeIp(ip);
  return v === "::1" || v === "127.0.0.1" || v.startsWith("127.");
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// Picks up geo headers when the app runs behind Cloudflare / Vercel /
// similar proxies. Render/Express alone has no GeoIP, so without these
// headers city/country stay empty — the browser timezone (sent by the
// beacon) is the fallback location signal.
export function geoFromHeaders(headers = {}) {
  const get = (name) => String(headers[name] || headers[name.toLowerCase()] || "").trim();
  let country = (
    get("cf-ipcountry") ||
    get("x-vercel-ip-country") ||
    get("x-country-code") ||
    get("x-geo-country") ||
    ""
  )
    .toUpperCase()
    .slice(0, 2);
  if (country === "XX" || country === "T1") country = "";
  const city = safeDecode(get("cf-ipcity") || get("x-vercel-ip-city") || get("x-geo-city") || "").slice(0, 100);
  return { city, country };
}

const TZ_COUNTRY = {
  "Asia/Kolkata": "IN",
  "Asia/Kathmandu": "NP",
  "Asia/Dhaka": "BD",
  "Asia/Karachi": "PK",
  "Asia/Colombo": "LK",
  "Asia/Dubai": "AE",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "Australia/Sydney": "AU",
};

export function countryFromTimezone(tz = "") {
  return TZ_COUNTRY[String(tz || "").trim()] || "";
}
