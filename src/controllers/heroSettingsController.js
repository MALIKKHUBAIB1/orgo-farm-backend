import { HeroSettings } from "../models/HeroSettings.js";

const TEXT_RX = /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;

function cleanText(value, label, max, { allowBr = false } = {}) {
  if (value === undefined || value === null) return null;
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer`);
  if (allowBr) {
    const plain = text.replace(/<br\s*\/?>/gi, "");
    if (/[<>]/.test(plain) || !TEXT_RX.test(plain))
      throw new Error(`${label} can only contain text and <br> line breaks`);
  } else if (!TEXT_RX.test(text)) {
    throw new Error(`${label} must be ${max} characters or fewer`);
  }
  return text;
}

function cleanUrl(value, label, max = 500) {
  if (value === undefined || value === null) return null;
  const url = typeof value === "string" ? value.trim() : "";
  if (url.length > max) throw new Error(`${label} URL is too long`);
  if (url && !/^https?:\/\//i.test(url)) throw new Error(`${label} must be a valid http(s) URL`);
  return url;
}

export async function getHeroSettings(_req, res) {
  try {
    const settings = await HeroSettings.findOne({ key: "main" }).lean();
    res.json({ settings: settings ?? null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function putHeroSettings(req, res) {
  try {
    const body = req.body ?? {};
    const fields = {};
    for (const [key, label] of [
      ["heroImage", "Hero image"],
      ["overlayImage", "Overlay image"],
    ]) {
      if (body[key] !== undefined) {
        const url = cleanUrl(body[key], label);
        if (url !== null) fields[key] = url;
      }
    }
    if (body.tagline !== undefined) {
      const tagline = cleanText(body.tagline, "Tagline", 60);
      if (tagline !== null) fields.tagline = tagline;
    }
    if (body.title !== undefined) {
      const title = cleanText(body.title, "Title", 120, { allowBr: true });
      if (title !== null) fields.title = title;
    }
    if (body.subtitle !== undefined) {
      const subtitle = cleanText(body.subtitle, "Subtitle", 300);
      if (subtitle !== null) fields.subtitle = subtitle;
    }
    const settings = await HeroSettings.findOneAndUpdate(
      { key: "main" },
      { $set: fields },
      { upsert: true, new: true },
    ).lean();
    res.json({ settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}