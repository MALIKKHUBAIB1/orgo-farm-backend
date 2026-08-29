import crypto from "node:crypto";
import { ImageKit } from "@imagekit/nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const UPLOAD_FOLDER = "/products";

function imageKit() {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT)
    throw new Error("ImageKit credentials are not configured");
  return new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
}

export async function uploadToken(req, res) {
  try {
    const ik = imageKit();
    const params = ik.helper.getAuthenticationParameters();
    res.json({ publicKey: process.env.IMAGEKIT_PUBLIC_KEY, ...params });
  } catch (error) {
    console.error("[uploads] token failed:", error.message);
    res.status(500).json({ error: "Could not prepare upload" });
  }
}

export async function uploadImage(req, res) {
  const chunked = req.headers["transfer-encoding"];
  const bytes = Number(req.headers["content-length"] || 0);
  if (chunked === "chunked" || (bytes && bytes > MAX_BYTES))
    return res.status(413).json({ error: "Image must be under 8 MB" });

  const raw = String(req.query.ext || req.get("x-image-ext") || ".jpg").toLowerCase().trim();
  const ext = raw.startsWith(".") ? raw : `.${raw}`;
  if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: "Unsupported image format" });

  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      req.destroy();
      return res.status(413).json({ error: "Image must be under 8 MB" });
    }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    const buffer = Buffer.concat(chunks);
    if (!buffer.length) return res.status(400).json({ error: "No image data received" });
    try {
      const uploaded = await imageKit().files.upload({
        file: buffer.toString("base64"),
        fileName,
        folder: UPLOAD_FOLDER,
        useUniqueFileName: false,
        overwriteFile: true,
      });
      console.log(`[uploads] saved ${uploaded.url} (${buffer.length} bytes)`);
      res.status(201).json({ path: uploaded.url });
    } catch (error) {
      console.error("[uploads] failed:", error.message);
      if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
    }
  });
  req.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
  });
}