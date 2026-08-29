import jwt from "jsonwebtoken";
import { AdminUser } from "../models/AdminUser.js";
import { ensureAdmin } from "../utils/adminSetup.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenFor(admin) {
  return jwt.sign({ uid: admin._id.toString(), role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function publicAdmin(admin) {
  return { id: admin._id.toString(), name: admin.name, email: admin.email };
}

async function findOrCreateAdmin(next) {
  const admin = await AdminUser.findOne().sort({ createdAt: 1 }).exec();
  if (admin) return admin;
  try {
    await ensureAdmin();
  } catch (err) {
    console.error("[admin-auth]", err.message);
    if (next) next();
  }
  return AdminUser.findOne().sort({ createdAt: 1 }).exec();
}

export async function adminLogin(req, res) {
  const { email = "", password = "" } = req.body ?? {};
  if (!EMAIL_RX.test(email)) return res.status(401).json({ error: "Invalid email or password" });
  if (password.length < 6) return res.status(401).json({ error: "Invalid email or password" });

  const admin = await AdminUser.findOne({ email: String(email).toLowerCase() });
  if (!admin || !verifyPassword(password, admin.passwordHash))
    return res.status(401).json({ error: "Invalid email or password" });

  await AdminUser.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  res.json({ token: tokenFor(admin), admin: publicAdmin(admin) });
}

export async function adminMe(req, res) {
  const admin = await AdminUser.findById(req.adminId).lean();
  if (!admin) return res.status(404).json({ error: "Admin account not found" });
  res.json(publicAdmin(admin));
}

export async function adminSetup(req, res) {
  const admin = await findOrCreateAdmin();
  res.json({ ok: true, admin: admin ? { id: admin._id.toString() } : null });
}