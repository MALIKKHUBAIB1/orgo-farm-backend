export function parseUserAgent(ua = "") {
  const u = String(ua || "");
  const lower = u.toLowerCase();
  let browser = "";
  let os = "";
  let device = "Desktop";

  if (/(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless)/i.test(u)) device = "Bot";
  else if (/mobile|android|iphone|ipod/i.test(lower)) device = "Mobile";
  else if (/ipad|tablet/i.test(lower)) device = "Tablet";

  if (lower.includes("edg")) browser = "Edge";
  else if (lower.includes("opr") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari")) browser = "Safari";
  else if (lower.includes("msie") || lower.includes("trident")) browser = "IE";

  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "iOS";
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