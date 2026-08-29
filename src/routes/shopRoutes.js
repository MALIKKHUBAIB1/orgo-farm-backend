import { Router } from "express";
import { getShopState, shopOp } from "../controllers/shopController.js";
import { createRateLimiter, validateShopKey } from "../middleware/security.js";

const router = Router();

router.get("/:key", validateShopKey, getShopState);
router.post("/:key", validateShopKey, createRateLimiter({ windowMs: 60 * 1000, max: 60, message: "Too many cart updates. Try again shortly." }), shopOp);

export default router;
