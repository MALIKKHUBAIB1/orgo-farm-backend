import { ShopState } from "../models/ShopState.js";
import { Product } from "../models/Product.js";
import { parseShopOp, validationError } from "../middleware/security.js";

function normalize(doc) {
  if (!doc) return { items: [], wishlist: [] };
  return {
    items: doc.items.map((i) => ({ slug: i.slug, qty: i.qty })),
    wishlist: doc.wishlist,
  };
}

async function getState(key) {
  return (await ShopState.findOne({ key }).lean()) ?? null;
}

export async function getShopState(req, res) {
  res.json(normalize(await getState(req.params.key)));
}

export async function shopOp(req, res) {
  let input;
  try {
    input = parseShopOp(req.body);
  } catch (error) {
    return validationError(res, error);
  }
  const { op, slug, qty } = input;
  const key = req.params.key;

  let state =
    (await ShopState.findOne({ key })) ?? (await ShopState.create({ key, items: [], wishlist: [] }));

  switch (op) {
    case "add": {
      const product = await Product.findOne({ slug }).lean();
      if (!product || !product.inStock)
        return res.status(400).json({ error: "Product unavailable" });
      const n = qty;
      const line = state.items.find((i) => i.slug === slug);
      if (line) line.qty += n;
      else state.items.push({ slug, qty: n });
      break;
    }
    case "setQty": {
      const n = qty;
      state.items = state.items
        .map((i) => (i.slug === slug ? { ...i.toObject?.() ?? i, qty: Math.max(1, n) } : i))
        .filter((i) => i.qty >= 1);
      break;
    }
    case "remove":
      state.items = state.items.filter((i) => i.slug !== slug);
      break;
    case "clearCart":
      state.items = [];
      break;
    case "toggleWishlist": {
      const product = await Product.findOne({ slug }).lean();
      if (!product) return res.status(400).json({ error: "Product not found" });
      state.wishlist = state.wishlist.includes(slug)
        ? state.wishlist.filter((s) => s !== slug)
        : [...state.wishlist, slug];
      break;
    }
    case "removeWishlist":
      state.wishlist = state.wishlist.filter((s) => s !== slug);
      break;
    default:
      return res.status(400).json({ error: `Unknown op: ${op}` });
  }

  await state.save();
  res.json(normalize(state.toObject()));
}
