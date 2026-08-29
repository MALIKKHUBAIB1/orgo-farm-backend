import { Router } from "express";
import { uploadImage, uploadToken } from "../controllers/uploadController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { createRateLimiter } from "../middleware/security.js";

const router = Router();

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many uploads. Try again later.",
});

router.get("/token", requireAdminUser, uploadToken);
router.post("/", requireAdminUser, uploadLimiter, uploadImage);

export default router;