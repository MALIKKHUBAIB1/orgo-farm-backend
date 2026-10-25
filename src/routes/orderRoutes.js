import { Router } from "express";
import { createOrder, getOrder, listMyOrders, listOrders } from "../controllers/orderController.js";
import { authOptional, authRequired } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

const orderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many orders. Try again later.",
});

router.get("/mine", authRequired, ah(listMyOrders));
router.post("/", authOptional, orderLimiter, ah(createOrder));
router.get("/", ah(listOrders));
router.get("/:id", ah(getOrder));

export default router;
