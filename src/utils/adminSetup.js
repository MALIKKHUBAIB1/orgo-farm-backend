import { AdminUser } from "../models/AdminUser.js";
import { hashPassword } from "./passwords.js";

export async function ensureAdmin() {
  const existing = await AdminUser.findOne().exec();
  if (existing) return existing;

  const email = String(process.env.ADMIN_EMAIL || "admin@orgo.in").toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || "orgo@admin123");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid ADMIN_EMAIL");
  if (password.length < 6) throw new Error("ADMIN_PASSWORD must be at least 6 characters");

  const admin = await AdminUser.create({
    name: "Orgo Admin",
    email,
    passwordHash: hashPassword(password),
  });
  console.log(`[admin] default admin created: ${email} (password: ${password})`);
  return admin;
}