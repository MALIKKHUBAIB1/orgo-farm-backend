import { Router } from "express";
import { listActiveCoupons, validateCoupon } from "../controllers/couponController.js";
import { ah } from "../middleware/asyncHandler.js";
import { createRateLimiter } from "../middleware/security.js";

const router = Router();

router.get("/", ah(listActiveCoupons));
router.post(
  "/validate",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many coupon attempts. Try again later.",
  }),
  ah(validateCoupon),
);

export default router;
