import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import crypto from "node:crypto";
import { parseOrder, validationError } from "../middleware/security.js";

const FAST_SHIPPING_FEE = 100;

function newOrderId() {
  return `OF${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function createOrder(req, res) {
  let input;
  try {
    input = parseOrder(req.body);
  } catch (error) {
    return validationError(res, error);
  }
  const { lines, customer, address, shipping, payment } = input;

  const slugs = [...new Set(lines.map((l) => String(l?.slug)))];
  const dbProducts = await Product.find({ slug: { $in: slugs } }).lean();
  const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));

  const orderLines = [];
  for (const l of lines) {
    const p = bySlug.get(String(l?.slug));
    if (!p) return res.status(400).json({ error: `Unknown product: ${l?.slug}` });
    if (!p.inStock) return res.status(400).json({ error: `Out of stock: ${p.name}` });
    const qty = Number(l?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20)
      return res.status(400).json({ error: `Invalid quantity for ${p.name}` });
    orderLines.push({ slug: p.slug, name: p.name, image: p.image, price: p.price, qty });
  }

  const subtotal = orderLines.reduce((s, l) => s + l.price * l.qty, 0);
  const shippingFee = shipping === "fast" ? FAST_SHIPPING_FEE : 0;

  const order = await Order.create({
    id: newOrderId(),
    userId: req.userId,
    lines: orderLines,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    customer,
    address,
    shipping,
    payment,
  });

  res.status(201).json(order);
}

export async function listMyOrders(req, res) {
  const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(orders);
}

export async function listOrders(req, res) {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(orders);
}

export async function getOrder(req, res) {
  const order = await Order.findOne({ id: req.params.id.toUpperCase() }).lean();
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}
