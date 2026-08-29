import { getTransporter } from "./contactEmail.js";

const brand = "ORGO FARM";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function apiBaseUrl() {
  return process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
}

export function storeBaseUrl() {
  return process.env.STORE_URL || "http://localhost:3000";
}

function inr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function productImage(node) {
  const { image } = node;
  if (!image) return "";
  const src = image.startsWith("http") ? image : `${apiBaseUrl()}${image}`;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.name)}" style="width:100%;height:200px;object-fit:cover;display:block" />`;
}

export function sendNewProductsEmail({ to, products }) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || `"${brand}" <${process.env.SMTP_USER}>`;
  const storeUrl = storeBaseUrl();

  const cards = products
    .map(
      (p) => `
        <a href="${storeUrl}/product/${escapeHtml(p.slug)}" style="text-decoration:none;color:inherit;display:block;box-shadow:0 2px 8px rgba(38,61,44,.08);border-radius:12px;overflow:hidden;background:#fff">
          ${productImage(p) || `<div style="height:200px;background:#e9e2d2;display:flex;align-items:center;justify-content:center;color:#263d2c;font-size:14px;letter-spacing:2px">${brand}</div>`}
          <div style="padding:16px 18px">
            <p style="margin:0;font-weight:700;color:#263d2c;font-size:16px">${escapeHtml(p.name)}</p>
            <p style="margin:6px 0 0;color:#263d2c;font-size:15px;font-weight:600">${inr(p.price)}</p>
          </div>
        </a>`,
    )
    .join("");

  const heading =
    products.length === 1
      ? `We just dropped <strong>${escapeHtml(products[0].name)}</strong>`
      : `New products just arrived at ORGO FARM`;

  return transporter.sendMail({
    from,
    to,
    replyTo: process.env.SMTP_USER,
    subject: `New arrivals at ORGO FARM — ${products.map((p) => escapeHtml(p.name)).join(", ").slice(0, 60)}`,
    html: `
      <div style="margin:0 auto;max-width:600px;font-family:Arial,sans-serif;color:#263d2c;line-height:1.6">
        <div style="padding:28px 32px;background:#263d2c;color:#fff">
          <p style="margin:0;font-size:12px;letter-spacing:2px">ORGO FARM</p>
          <h1 style="margin:10px 0 0;font-size:26px;font-weight:normal">${heading}</h1>
        </div>
        <div style="padding:32px;background:#faf8f2">
          <p style="margin:0 0 24px">Hello,</p>
          <p style="margin:0 0 28px">Something new is ready for your skin. Shop the latest from ORGO FARM before it is gone.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">${cards}</div>
          <p style="margin:32px 0 0">
            <a href="${storeUrl}/shop" style="display:inline-block;background:#263d2c;color:#fff;text-decoration:none;padding:12px 26px;border-radius:99px;font-size:14px">Shop all products</a>
          </p>
          <p style="margin:28px 0 0;font-size:12px;color:#263d2c;opacity:.65">
            With care,<br /><strong>ORGO FARM</strong>
          </p>
          <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e9e2d2;font-size:11px;color:#263d2c;opacity:.5">
            You are receiving this because you subscribed to ORGO FARM updates. To stop receiving these emails, visit
            <a href="${storeUrl}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#263d2c">unsubscribe here</a>.
          </p>
        </div>
      </div>`,
  });
}