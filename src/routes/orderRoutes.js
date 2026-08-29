import { Router } from "express";
import { createOrder, getOrder, listMyOrders, listOrders } from "../controllers/orderController.js";
import { authOptional, authRequired } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/security.js";

const router = Router();

const orderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many orders. Try again later.",
});

router.get("/mine", authRequired, listMyOrders);
router.post("/", authOptional, orderLimiter, createOrder);
router.get("/", listOrders);
router.get("/:id", getOrder);

export default router;
