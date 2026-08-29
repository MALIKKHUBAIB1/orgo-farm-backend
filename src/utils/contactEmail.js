import nodemailer from "nodemailer";

const brand = "ORGO FARM";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtmlMessage(message) {
  return escapeHtml(message).replaceAll("\n", "<br />");
}

export function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendContactEmails({ name, email, phone, message }) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || `\"${brand}\" <${process.env.SMTP_USER}>`;
  const ownerEmail = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeMessage = toHtmlMessage(message);

  await Promise.all([
    transporter.sendMail({
      from,
      to: ownerEmail,
      replyTo: email,
      subject: `New contact enquiry from ${name}`,
      text: `New contact enquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#263d2c;line-height:1.6">
          <h2 style="margin:0 0 16px;color:#263d2c">New contact enquiry</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Message:</strong><br />${safeMessage}</p>
        </div>`,
    }),
    transporter.sendMail({
      from,
      to: email,
      subject: "We received your message — ORGO FARM",
      text: `Hi ${name},\n\nThank you for reaching out to ORGO FARM. We have received your message and will get back to you shortly.\n\nWith care,\nORGO FARM`,
      html: `
        <div style="margin:0 auto;max-width:600px;font-family:Arial,sans-serif;color:#263d2c;line-height:1.6">
          <div style="padding:28px 32px;background:#263d2c;color:#fff">
            <p style="margin:0;font-size:12px;letter-spacing:2px">ORGO FARM</p>
            <h1 style="margin:10px 0 0;font-size:28px;font-weight:normal">Thank you for reaching out</h1>
          </div>
          <div style="padding:32px;background:#faf8f2">
            <p>Hi ${safeName},</p>
            <p>Thank you for contacting ORGO FARM. We have received your message and our team will get back to you shortly.</p>
            <p style="margin:28px 0 0">With care,<br /><strong>ORGO FARM</strong></p>
          </div>
        </div>`,
    }),
  ]);
}
