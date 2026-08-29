import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ShopState } from "../models/ShopState.js";
import { Profile } from "../models/Profile.js";
import { Order } from "../models/Order.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureStateKey(userId) {
  const existing = await User.findById(userId, { stateKey: 1 }).lean();
  if (existing?.stateKey) return existing.stateKey;
  const key = crypto.randomUUID();
  await User.updateOne({ _id: userId }, { $set: { stateKey: key } });
  return key;
}

function tokenFor(user) {
  return jwt.sign({ uid: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user, shopKey) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    shopKey,
    address: {
      address: user.address?.address ?? "",
      city: user.address?.city ?? "",
      state: user.address?.state ?? "",
      pin: user.address?.pin ?? "",
    },
  };
}

export async function register(req, res) {
  const { name = "", email = "", phone = "", password = "" } = req.body ?? {};
  if (!name.trim()) return res.status(400).json({ error: "Name is required" });
  if (!EMAIL_RX.test(email)) return res.status(400).json({ error: "Valid email is required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const exists = await User.findOne({ email: email.toLowerCase() }).lean();
  if (exists) return res.status(409).json({ error: "Email already registered. Please login." });

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    phone: String(phone).trim(),
    passwordHash: hashPassword(password),
  });

  res.status(201).json({ token: tokenFor(user), user: publicUser(user, user.stateKey) });
}

export async function login(req, res) {
  const { email = "", password = "" } = req.body ?? {};
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !verifyPassword(password, user.passwordHash))
    return res.status(401).json({ error: "Invalid email or password" });

  const shopKey = await ensureStateKey(user._id);
  res.json({ token: tokenFor(user), user: publicUser(user, shopKey) });
}

export async function me(req, res) {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  const shopKey = await ensureStateKey(req.userId);
  res.json(publicUser(user, shopKey));
}

export async function mergeSession(req, res) {
  const sessionKey = String(req.body?.sessionKey ?? "").trim();
  if (!sessionKey || sessionKey.startsWith("user:")) return res.json({ ok: true });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  await ensureStateKey(user);
  const userKey = user.stateKey;

  const [sessionState, sessionProfile] = await Promise.all([
    ShopState.findOne({ key: sessionKey }),
    Profile.findOne({ key: sessionKey }).lean(),
  ]);

  if (sessionState) {
    let userState =
      (await ShopState.findOne({ key: userKey })) ??
      (await ShopState.create({ key: userKey, items: [], wishlist: [] }));

    for (const item of sessionState.items) {
      const line = userState.items.find((i) => i.slug === item.slug);
      if (line) line.qty += item.qty;
      else userState.items.push({ slug: item.slug, qty: item.qty });
    }
    for (const slug of sessionState.wishlist) {
      if (!userState.wishlist.includes(slug)) userState.wishlist.push(slug);
    }
    await userState.save();
    await ShopState.deleteOne({ key: sessionKey });
  }

  if (sessionProfile) {
    const userProfile = (await Profile.findOneAndUpdate(
      { key: userKey },
      {
        $setOnInsert: {
          key: userKey,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: sessiodress ?? {},
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ))?.toObject();

    const updates = {};
    if (userProfile && !userProfile.name && sessionProfile.name) updates.name = sessionProfile.name;
    if (userProfile && !userProfile.phone && sessionProfile.phone) updates.phone = sessionProfile.phone;
    if (
      userProfile &&
      !userProfile.address?.address &&
      (sessionProfile.address?.address || user.address?.address)
    )
      updates.address = sessionProfile.address?.address ? sessionProfile.address : user.address;
    if (Object.keys(updates).length)
      await Profile.updateOne({ key: userKey }, { $set: updates });

    await Profile.deleteOne({ key: sessionKey });
  }

  await Order.updateMany(
    { "customer.email": user.email, userId: { $exists: false } },
    { $set: { userId: req.userId } },
  );

  res.json({ ok: true });
}
