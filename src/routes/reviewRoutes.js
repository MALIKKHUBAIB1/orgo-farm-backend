import { Router } from "express";
import { createReview, listReviews } from "../controllers/reviewController.js";
import { createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

// Generous but abuse-proof: a device can post a few reviews per hour.
const reviewLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many reviews. Please try again later.",
});

router.get("/:slug", ah(listReviews));
router.post("/:slug", reviewLimiter, ah(createReview));

export default router;
